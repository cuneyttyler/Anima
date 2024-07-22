Scriptname AnimaDialogueQuestScript extends Quest  

topic property target_topic auto
topic property source_n2n_topic auto
topic property target_n2n_topic auto
topic property broadcast_topic_1 auto
topic property broadcast_topic_2 auto
topic property broadcast_topic_3 auto
topic property broadcast_topic_4 auto
topic property broadcast_topic_5 auto
topic property broadcast_topic_6 auto
topic property broadcast_topic_7 auto
topic property broadcast_topic_8 auto
topic property broadcast_topic_9 auto
topic property broadcast_topic_10 auto
topic property broadcast_topic_11 auto
topic property broadcast_topic_12 auto
topic property broadcast_topic_13 auto
topic property broadcast_topic_14 auto
topic property broadcast_topic_15 auto
topic property follower_topic_1 auto
topic property follower_topic_2 auto
topic property follower_topic_3 auto
topic property follower_topic_4 auto
topic property follower_topic_5 auto
referencealias property target auto
referencealias property source_n2n auto
referencealias property target_n2n auto
referencealias property broadcast_speaker_1 auto
referencealias property broadcast_speaker_2 auto
referencealias property broadcast_speaker_3 auto
referencealias property broadcast_speaker_4 auto
referencealias property broadcast_speaker_5 auto
referencealias property broadcast_speaker_6 auto
referencealias property broadcast_speaker_7 auto
referencealias property broadcast_speaker_8 auto
referencealias property broadcast_speaker_9 auto
referencealias property broadcast_speaker_10 auto
package property AnimaTravelToNpcLocationPackage auto
package property AnimaStandPackage auto
package property AnimaN2NStandPackage auto
formlist property _AnimaRaceList auto
GlobalVariable property ConversationOnGoing auto
GlobalVariable property N2N_ConversationOnGoing auto
GlobalVariable property N2N_LastSuccessfulStart auto
faction property CurrentFollowerFaction auto
faction property PotentialFollowerFaction auto
quest property DialogueFollower auto

Actor lookAtSource

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
    self.RegisterForModEvent("BLC_Speak_Broadcast", "Speak_Broadcast")
    self.RegisterForModEvent("BLC_Stop_Broadcast", "Stop_Broadcast")
    self.RegisterForModEvent("BLC_Send_LookAt", "Send_LookAt")
    self.RegisterForModEvent("BLC_TravelToNPCLocation", "TravelToNPCLocation")
    self.RegisterForModEvent("BLC_SetHoldPosition", "SetHoldPosition")
    self.RegisterForModEvent("BLC_SendResponseLog", "SendResponseLog")
    self.RegisterForModEvent("BLC_ShowNotification", "ShowNotification")
    self.RegisterForModEvent("BLC_HardReset", "HardReset")
 
   ConversationOngoing.SetValueInt(0)
   N2N_ConversationOngoing.SetValueInt(0)
   N2N_LastSuccessfulStart.SetValueInt(0)
endFunction

function SetHoldPosition(String eventName, String strArg, Float numArg, Form sender)
    if numArg as Int == 0
        (sender as Actor).SetLookAt(Game.GetPlayer())
    endIf
endFunction

function ShowNotification(String eventName, String strArg, Float numArg, Form sender)
    Debug.Notification(strArg)
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

function Speak_Broadcast(String eventName, String strArg, Float numArg, Form sender) 
    If (sender as Actor) == None
        debug.Trace("Anima: Broadcast/Follower Speak request == Actor NULL, returning.")
        Return
    EndIf
    debug.Trace("Anima: Broadcast/Follower Speak request for " + (sender as Actor).GetDisplayName() + " (" + numArg + ")")
    ActorUtil.AddPackageOverride(sender as Actor, AnimaStandPackage)
    If numArg == 0
        (sender as Actor).Say(broadcast_topic_1)
    EndIf
    If numArg == 1
        (sender as Actor).Say(broadcast_topic_2)
    EndIf
    If numArg == 2
        (sender as Actor).Say(broadcast_topic_3)
    EndIf
    If numArg == 3
        (sender as Actor).Say(broadcast_topic_4)
    EndIf
    If numArg == 4
        (sender as Actor).Say(broadcast_topic_5)
    EndIf
    If numArg == 5
        (sender as Actor).Say(broadcast_topic_6)
    EndIf
    If numArg == 6
        (sender as Actor).Say(broadcast_topic_7)
    EndIf
    If numArg == 7
        (sender as Actor).Say(broadcast_topic_8)
    EndIf
    If numArg == 8
        (sender as Actor).Say(broadcast_topic_9)
    EndIf
    If numArg == 9
        (sender as Actor).Say(broadcast_topic_10)
    EndIf
    If numArg == 10
        (sender as Actor).Say(broadcast_topic_11)
    EndIf
    If numArg == 11
        (sender as Actor).Say(broadcast_topic_12)
    EndIf
    If numArg == 12
        (sender as Actor).Say(broadcast_topic_13)
    EndIf
    If numArg == 13
        (sender as Actor).Say(broadcast_topic_14)
    EndIf
    If numArg == 14
        (sender as Actor).Say(broadcast_topic_15)
    EndIf
    If numArg == 15
        (sender as Actor).Say(follower_topic_1)
    EndIf
    If numArg == 16
        (sender as Actor).Say(follower_topic_2)
    EndIf
    If numArg == 17
        (sender as Actor).Say(follower_topic_3)
    EndIf
    If numArg == 18
        (sender as Actor).Say(follower_topic_4)
    EndIf
    If numArg == 19
        (sender as Actor).Say(follower_topic_5)
    EndIf
    debug.Trace("Anima: " + (sender as Actor).GetDisplayName() + "(" + numARg + ") speaked.")
endFunction

function Stop_Broadcast(String eventName, String strArg, Float numArg, Form sender) 
    debug.Trace("Anima: Broadcast/Follower Stop request for " + " (" + numArg + ")")
    ActorUtil.ClearPackageOverride(sender as Actor)
endFunction

function Send_LookAt(String eventName, String strArg, Float numArg, Form sender)
    Debug.Trace("Send_LookAt " + (sender as Actor).GetDisplayName() + " (" + numArg + ")")
    If numArg == 0
        lookAtSource = sender as Actor
    ElseIf numArg == 1
        lookAtSource.SetLookAt(sender as Actor)
    ElseIf numArg == 2
        lookAtSource.SetLookat(None)
    EndIf
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
    Utility.Wait(1)
    Reset_Normal()
    Reset_N2N()
endFunction

function Reset_Normal()
    Debug.Trace("Anima: Reset.")
    target.Clear()
    ConversationOnGoing.SetValueInt(0)
    AnimaSKSE.Stop()
endFunction

function Reset_N2N()
    Debug.Trace("Anima: Reset_N2N.")
    ; If source_n2n.GetActorRef() != None
    ;     Debug.Trace("Toggling actor" + source_n2n.GetActorRef().GetDisplayName())
    ;     source_n2n.GetActorRef().Disable()
    ;     Utility.Wait(0.1)
    ;     source_n2n.GetActorRef().Enable()
    ; EndIf
    ; If target_n2n.GetActorRef() != None
    ;     Debug.Trace("Toggling actor" + target_n2n.GetActorRef().GetDisplayName())
    ;     target_n2n.GetActorRef().Disable()
    ;     Utility.Wait(0.1)
    ;     target_n2n.GetActorRef().Enable()
    ; EndIf
    source_n2n.Clear()
    target_n2n.Clear()
    N2N_ConversationOnGoing.SetValueInt(0)
    N2N_LastSuccessfulStart.SetValueInt(0)
    AnimaSKSE.N2N_Stop()
endFunction

function HardReset(String eventName, String strArg, Float numArg, Form sender)
    debug.Trace("Anima: HARDRESET")
    ConversationOnGoing.SetValueInt(0)
    N2N_ConversationOnGoing.SetValueInt(0)
    N2N_LastSuccessfulStart.SetValueInt(N2N_LastSuccessfulStart.GetValueInt() - 120)
    If target.GetActorRef() != None
        target.GetActorRef().Disable()
        Utility.Wait(0.1)
        target.GetActorRef().Enable()
    EndIf
    target.Clear()
    If source_n2n.GetActorRef() != None
        source_n2n.GetActorRef().Disable()
        Utility.Wait(0.1)
        source_n2n.GetActorRef().Enable()
    EndIf
    If target_n2n.GetActorRef() != None
        target_n2n.GetActorRef().Disable()
        Utility.Wait(0.1)
        target_n2n.GetActorRef().Enable()
    EndIf
    source_n2n.Clear()
    target_n2n.Clear()
endfunction

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

bool function IsRaceIncluded(Actor _actor) 
    return _AnimaRaceList.HasForm(_actor.GetRace())
endFunction

bool function IsAvailableForDialogue(Actor _actor)
    return IsRaceIncluded(_actor) && _actor.GetCombatState() == 0 && _actor.IsEnabled()&& !_actor.IsAlerted() && !_actor.IsAlarmed()  && !_actor.IsBleedingOut() && !_actor.isDead() && !_actor.IsUnconscious()  && _actor.GetSleepState() == 0
endFunction
