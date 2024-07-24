Scriptname AnimaDialogueQuestN2NScript extends Quest  

formlist property _AnimaRaceList auto
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
            Actor sourceActor = game.FindRandomActorFromRef(Game.GetPlayer(), 1000)
            Debug.Trace("Source Actor: " + sourceActor.GetDisplayName() + ", " + IsAvailableForDialogue(sourceActor))
            If sourceActor != None && sourceActor != Game.GetPlayer() && IsAvailableForDialogue(sourceActor)
                Actor targetActor = game.FindRandomActorFromRef(sourceActor, 350)
                Debug.Trace("Target Actor: " + targetActor.GetDisplayName() + ", " + IsAvailableForDialogue(targetActor))

                If targetActor != None && targetActor != sourceActor && targetActor != Game.GetPlayer() && IsAvailableForDialogue(targetActor)               
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
                        AnimaSKSE.N2N_Initiate(sourceActor, targetActor, GetVoiceType(sourceActor), GetVoiceType(targetActor), Utility.GameTimeToString(Utility.GetCurrentGameTime()))
                        SetPreviousActors(sourceActor, targetActor)
                        Utility.Wait(20)
                    Else
                        Debug.Trace("Anima: NOT STARTING.")
                        Debug.Trace("Anima: Ongoing? : " + N2N_ConversationOnGoing.GetValueInt())
                        Debug.Trace("Anima: " + diff +" > " + interval + " ?")
                    EndIf
                EndIf
            EndIf
        EndIf
        Utility.Wait(3)
    EndWhile
endFunction

function SetPreviousActors(Actor source, Actor target)
    previousSource = source
    previousTarget = target
endFunction

bool function IsSameActors(Actor source, Actor target)
    return source != None && target != None && previousSource != None && previousTarget != None && (source == previousSource && target == previousTarget) || (source == previousTarget || target == previousSource)
endFunction 

string function GetVoiceType(Actor _actor)
    string str = _actor.GetVoiceType() as string
    int startIndex = StringUtil.Find(str, "<", 0)
    int endIndex = StringUtil.Find(str," ", startIndex)
    return StringUtil.Substring(str, startIndex + 1, endIndex - startIndex - 1)
endFunction

bool function IsRaceIncluded(Actor _actor) 
    return _AnimaRaceList.HasForm(_actor.GetRace())
endFunction

bool function IsAvailableForDialogue(Actor _actor)
    return IsRaceIncluded(_actor) && _actor.GetCombatState() == 0 && normalTarget.GetActorRef() != _actor && _actor.GetCurrentScene() == None && _actor.IsEnabled() && !_actor.IsAlerted() && !_actor.IsAlarmed()  && !_actor.IsBleedingOut() && !_actor.isDead() && !_actor.IsUnconscious() && _actor.GetSleepState() == 0
endFunction

