Scriptname AnimaEventLogger extends Quest

actor[] actors
int numFoundActors

ReferenceAlias[] property ActorRefs auto
formlist property _AnimaVoiceTypes auto
formlist property _AnimaVoiceTypes_Exclude auto

Event OnInit()
    numFoundActors = 0
    LogEvents()
EndEvent

Function LogEvents()
    While True
        FindAllNpcsInArea()
        AssignActorsToRefs()
        SendActors()
        Utility.Wait(10)
    EndWhile
EndFunction

Function FindAllNpcsInArea()
    actors = MiscUtil.ScanCellNPCs(Game.GetPlayer(), 2500)
    int i = 0
    While i < actors.Length
        If !IsAvailable(actors[i])
            actors = PapyrusUtil.RemoveActor(actors, actors[i])
        Else
            i += 1
        EndIf
    EndWhile
EndFunction

Function AssignActorsToRefs()
    int i = 0
    While i < actors.Length
        If actors[i] != None
            ActorRefs[i].ForceRefTo(actors[i])
        EndIf
        i += 1
    EndWhile
EndFunction

Function SendActors()
    AnimaSKSE.ClearActors()
    int i = 0
    While i < actors.Length
        If actors[i] != None && actors[i] != Game.GetPlayer()
            Debug.Trace("Anima: SENDING ACTOR " + actors[i].GetDisplayName())
            AnimaSKSE.SendActor(actors[i], GetVoiceType(actors[i]))
        EndIf
        i += 1
    EndWhile
EndFunction

string function GetVoiceType(Actor _actor)
    string str = _actor.GetVoiceType() as string
    int startIndex = StringUtil.Find(str, "<", 0)
    int endIndex = StringUtil.Find(str," ", startIndex)
    return StringUtil.Substring(str, startIndex + 1, endIndex - startIndex - 1)
endFunction

bool function IsVoiceIncluded(Actor _actor) 
    return _AnimaVoiceTypes != None && _AnimaVoiceTypes.GetAt(0) != None && _AnimaVoiceTypes.GetAt(1) != None && _actor.GetVoiceType() != None && ((_AnimaVoiceTypes.GetAt(0) as FormList).HasForm(_actor.GetVoiceType()) || (_AnimaVoiceTypes.GetAt(1) as FormList).HasForm(_actor.GetVoiceType())) &&  !_AnimaVoiceTypes_Exclude.HasForm(_actor.GetVoiceType())
endFunction

bool function IsAvailable(Actor _actor)
    return  IsVoiceIncluded(_actor) && _actor.IsEnabled() && !_actor.isDead() && !_actor.IsUnconscious() && _actor.GetSleepState() == 0
endFunction

bool Function IsInArray(Actor _actor, Actor[] arr)
    If _actor == None
        Return False
    EndIf
    int i = 0
    While i < numFoundActors
        If arr[i] == _actor
            Return True
        EndIf
        i += 1
    EndWhile

    Return False
EndFunction