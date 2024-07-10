Scriptname AnimaDialogueQuestScript extends Quest  

topic property target_topic auto
topic property source_n2n_topic auto
topic property target_n2n_topic auto
referencealias property target auto
referencealias property source_n2n auto
referencealias property target_n2n auto
package property AnimaTravelToNpcLocationPackage auto
package property AnimaStandPackage auto
package property AnimaN2NStandPackage auto
formlist property _AnimaVoiceTypes auto
formlist property _AnimaVoiceTypes_Exclude auto
GlobalVariable property ConversationOnGoing auto
GlobalVariable property N2N_ConversationOnGoing auto
GlobalVariable property N2N_LastSuccessfulStart auto
faction property CurrentFollowerFaction auto
faction property PotentialFollowerFaction auto
quest property DialogueFollower auto
; quest property AnimaDialogueQuest auto

function OnInit()
    self.RegisterForModEvent("BLC_Start", "_Start")
    self.RegisterForModEvent("BLC_Stop", "_Stop")
	self.RegisterForModEvent("BLC_Speak", "Speak")
    self.RegisterForModEvent("BLC_Follow_Request_Accepted", "AddToFollowers")
    self.RegisterForModEvent("BLC_Start_N2N", "Start_N2N")
    self.RegisterForModEvent("BLC_Start_N2N_Source", "Start_N2N_Source")
    self.RegisterForModEvent("BLC_Start_N2N_Target", "Start_N2N_Target")
    self.RegisterForModEvent("BLC_Stop_N2N", "Stop_N2N")
    self.RegisterForModEvent("BLC_Speak_N2N", "Speak_N2N")
    self.RegisterForModEvent("BLC_TravelToNPCLocation", "TravelToNPCLocation")
    self.RegisterForModEvent("BLC_SetHoldPosition", "SetHoldPosition")
    self.RegisterForModEvent("BLC_SendResponseLog", "SendResponseLog")
 
   ConversationOngoing.SetValueInt(0)
   N2N_ConversationOngoing.SetValueInt(0)
   N2N_LastSuccessfulStart.SetValueInt(0)
endFunction

function SetHoldPosition(String eventName, String strArg, Float numArg, Form sender)
    if numArg as Int == 0
        (sender as Actor).SetLookAt(Game.GetPlayer())
    endIf
endFunction

function TravelToNPCLocation(String eventName, String strArg, Float numArg, Form sender)
    ActorUtil.AddPackageOverride(source_n2n.GetActorRef(), AnimaTravelToNpcLocationPackage, 0)
    source_n2n.GetActorRef().EvaluatePackage()
endFunction

function _Start(String eventName, String strArg, Float numArg, Form sender) 
    If (sender as Actor) == None
        debug.Trace("Anima: Actor is None. Returning.")
        Reset_Normal()
        return;
    EndIf
    If (sender as Actor) == source_n2n.GetActorRef() || (sender as Actor) == target_n2n.GetActorRef()
        debug.Notification("NPC is busy.")
        Reset_Normal()
        return;
    EndIf
    If !IsAvailableForDialogue(sender as Actor)
        Debug.Notification("NPC is not available for dialogue.")
        Reset_Normal()
        return
    EndIf
    debug.Trace("Anima: Start Dialogue")
    debug.Notification("NPC is listening...")
    ConversationOnGoing.SetValueInt(1)
    target.ForceRefTo(sender as Actor)
    SetHoldPosition("", "", 0, sender)

    AnimaSKSE.Start(sender as Actor, GetVoiceType(sender as Actor), Utility.GameTimeToString(Utility.GetCurrentGameTime()))
    CheckDistance()
endFunction

function _Stop(String eventName, String strArg, Float numArg, Form sender) 
    debug.Trace("Anima: Stop Dialogue")
    ConversationOnGoing.SetValueInt(0)
    target.Clear()
endFunction

string function GetVoiceType(Actor _actor)
    string str = _actor.GetVoiceType() as string
    int startIndex = StringUtil.Find(str, "<", 0)
    int endIndex = StringUtil.Find(str," ", startIndex)
    return StringUtil.Substring(str, startIndex + 1, endIndex - startIndex - 1)
endFunction

function CheckDistance()
	While ConversationOnGoing.GetValueInt() == 1
         Actor _actor = target.GetActorRef()
         If _actor != None && Game.GetPlayer().GetDistance(_actor) > 350
              Debug.Trace("Sending STOP")
             Reset_Normal()
         EndIf
        Utility.Wait(1)
    EndWhile
endFunction

function Speak(String eventName, String strArg, Float numArg, Form sender) 
    If sender == None
        debug.Trace("Anima: Speak request == Actor NULL, returning.")
        Return
    EndIf
    debug.Trace("Anima: Speak request for " + (sender as Actor).GetDisplayName())
    target.GetActorRef().Say(target_topic)
    debug.Trace("Anima: " + target.GetActorRef().GetDisplayName() + " speaked.")
endFunction

function Start_N2N(String eventName, String strArg, Float numArg, Form sender)
    Debug.Trace("Anima: Starting N2N Dialogue.")
    N2N_ConversationOnGoing.SetValue(1)
    N2N_LastSuccessfulStart.SetValueInt((Utility.GetCurrentRealTime() as int) % 1000)
endFunction

function Start_N2N_Source(String eventName, String strArg, Float numArg, Form sender)
    source_n2n.ForceRefTo(sender as Actor)
endFunction

function Start_N2N_Target(String eventName, String strArg, Float numArg, Form sender)
    target_n2n.ForceRefTo(sender as Actor)
    If source_n2n.GetActorRef() != None && target_n2n.GetActorRef() != None
        source_n2n.GetActorRef().SetLookAt(target_n2n.GetActorRef())
        target_n2n.GetActorRef().SetLookAt(source_n2n.GetActorRef())
    EndIf
    ; (AnimaDialogueQuest as AnimaDIalogueQuestN2NScript).SetPreviousActors(source_n2n.GetActorRef(), target_n2n.GetActorRef())
endFunction

function Stop_N2N(String eventName, String strArg, Float numArg, Form sender)
    Debug.Trace("Anima: Stopping N2N Dialogue.")
    Utility.Wait(3) ; Wait for last line to be spoken
    N2N_ConversationOnGoing.SetValue(0)
    source_n2n.Clear()
    target_n2n.Clear()
endFunction

function Speak_N2N(String eventName, String strArg, Float numArg, Form sender) 
    debug.Trace("Anima: Speak request for " + numArg + " -> " + (sender as Actor).GetDisplayName())
    If numArg == 0 && N2N_ConversationOnGoing.GetValueInt() == 1
        source_n2n.GetActorRef().SetLookAt(target_n2n.GetActorRef())
        source_n2n.GetActorRef().Say(source_n2n_topic)
    ElseIf N2N_ConversationOnGoing.GetValueInt() == 1
        target_n2n.GetActorRef().SetLookAt(source_n2n.GetActorRef())
        target_n2n.GetActorRef().Say(target_n2n_topic)
    EndIf
endFunction

function Reset()
    Reset_Normal()
    Reset_N2N()
endFunction

function Reset_Normal()
    Debug.Trace("Anima: Reset.")
    ConversationOnGoing.SetValueInt(0)
    AnimaSKSE.Stop()
endFunction

function Reset_N2N()
    Debug.Trace("Anima: Reset_N2N.")
    N2N_ConversationOnGoing.SetValueInt(0)
    AnimaSKSE.N2N_Stop()
endFunction

function SendResponseLog(String eventName, String strArg, Float numArg, Form sender)
    AnimaSKSE.SendResponseLog(sender as Actor, strArg)
endfunction

function AddToFollowers(String eventName, String strArg, Float numArg, Form sender)
    Actor _actor = sender as Actor

    _actor.AddtoFaction(CurrentFollowerFaction)
    _actor.AddToFaction(PotentialFollowerFaction)
    (DialogueFollower as DialogueFollowerScript).SetFollower(_actor)
    (DialogueFollower as DialogueFollowerScript).FollowerFollow()

    Debug.Notification(_actor.GetDisplayName() + " is now following you.")
endFunction

bool function IsVoiceIncluded(Actor _actor) 
    return _AnimaVoiceTypes != None && _AnimaVoiceTypes.GetAt(0) != None && _AnimaVoiceTypes.GetAt(1) != None &&  _actor.GetVoiceType() != None && ((_AnimaVoiceTypes.GetAt(0) as FormList).HasForm(_actor.GetVoiceType()) || (_AnimaVoiceTypes.GetAt(1) as FormList).HasForm(_actor.GetVoiceType())) &&  !_AnimaVoiceTypes_Exclude.HasForm(_actor.GetVoiceType())
endFunction

bool function IsAvailableForDialogue(Actor _actor)
    return IsVoiceIncluded(_actor) && _actor.GetCombatState() == 0 && _actor.IsEnabled()&& !_actor.IsAlerted() && !_actor.IsAlarmed()  && !_actor.IsBleedingOut() && !_actor.isDead() && !_actor.IsUnconscious()
endFunction
