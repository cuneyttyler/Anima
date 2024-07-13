Scriptname AnimaDialogueQuestN2NScript extends Quest  

formlist property _AnimaVoiceTypes auto
formlist property _AnimaVoiceTypes_Exclude auto
globalvariable property N2N_ConversationOnGoing auto
GlobalVariable property N2N_LastSuccessfulStart auto
ReferenceAlias property normalTarget auto

int lastTryTime
int retryInterval
int initiateTimeInterval
int initiateSamePairTimeInterval

Actor previousSource
Actor previousTarget

function OnInit()
    CheckN2NDialogue()
endFunction

function CheckN2NDialogue()
   lastTryTime = 0
   retryInterval = 10
   initiateTimeInterval = 60
   initiateSamePairTimeInterval = 120
    
    N2N_ConversationOnGoing.SetValueInt(0)
    N2N_LastSuccessfulStart.SetValueInt(0)
    
    While true
       int _time = Utility.GetCurrentRealTime() as int
        _time = _time % 1000

        If N2N_ConversationOnGoing != None && N2N_ConversationOnGoing.GetValueInt() == 0
            Actor sourceActor = game.FindRandomActorFromRef(Game.GetPlayer(), 700)
            If sourceActor != None && sourceActor != Game.GetPlayer() && IsAvailableForDialogue(sourceActor)
                Debug.Trace("Anima: Source Actor = " + sourceActor.GetDisplayName())
                Actor targetActor = game.FindRandomActorFromRef(sourceActor, 350)

                If targetActor != None && targetActor != sourceActor && targetActor != Game.GetPlayer() && IsAvailableForDialogue(targetActor)
		            Debug.Trace("Anima: Target Actor = " + targetActor.GetDisplayName())                    

                    Debug.Trace("_time: " + _time)
                    Debug.Trace("N2N_LastSuccessfulStart: " + N2N_LastSuccessfulStart.GetValueInt())
                    Debug.Trace("INTERVAL: " + interval)
                    
                    Int interval = initiateTimeInterval
                    If IsSameActors(sourceActor, targetActor)
                        interval = initiateSamePairTimeInterval
                    EndIf
                    Int diff = _time - N2N_LastSuccessfulStart.GetValueInt()
                    If diff < 0
                        N2N_LastSuccessfulStart.SetValueInt(0)
                    EndIf
                    If N2N_ConversationOnGoing != None && N2N_ConversationOnGoing.GetValueInt() == 0 && (lastTryTime == 0 || diff > interval)
                        
                        Debug.Trace("Anima: Sending InitiateConversation Signal For " + sourceActor.GetDisplayName() + " and " + targetActor.GetDisplayName())
                        lastTryTime = _time
                        AnimaSKSE.N2N_Initiate(sourceActor, targetActor, GetVoiceType(sourceActor), GetVoiceType(targetActor))
                        SetPreviousActors(sourceActor, targetActor)
                    EndIf
                EndIf
            EndIf
        EndIf
    EndWhile
endFunction

function SetPreviousActors(Actor source, Actor target)
    previousSource = source
    previousTarget = target
endFunction

bool function IsSameActors(Actor source, Actor target)
    return source != None && target != None && previousSource != None && previousTarget != None && (source == previousSource && target == previousTarget) || (source == previousTarget || target == previousSource)
endFunction 

bool function IsVoiceIncluded(Actor _actor) 
    return _AnimaVoiceTypes != None && _AnimaVoiceTypes.GetAt(0) != None && _AnimaVoiceTypes.GetAt(1) != None &&  _actor.GetVoiceType() != None && ((_AnimaVoiceTypes.GetAt(0) as FormList).HasForm(_actor.GetVoiceType()) || (_AnimaVoiceTypes.GetAt(1) as FormList).HasForm(_actor.GetVoiceType())) &&  !_AnimaVoiceTypes_Exclude.HasForm(_actor.GetVoiceType())
endFunction

string function GetVoiceType(Actor _actor)
    string str = _actor.GetVoiceType() as string
    int startIndex = StringUtil.Find(str, "<", 0)
    int endIndex = StringUtil.Find(str," ", startIndex)
    return StringUtil.Substring(str, startIndex + 1, endIndex - startIndex - 1)
endFunction

bool function IsAvailableForDialogue(Actor _actor)
    return IsVoiceIncluded(_actor) && _actor.GetCombatState() == 0 && normalTarget.GetActorRef() != _actor && _actor.GetCurrentScene() == None && _actor.IsEnabled() && !_actor.IsAlerted() && !_actor.IsAlarmed()  && !_actor.IsBleedingOut() && !_actor.isDead() && !_actor.IsUnconscious() && _actor.GetSleepState() == 0
endFunction

