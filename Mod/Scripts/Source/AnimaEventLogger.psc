Scriptname AnimaEventLogger extends Quest

actor[] previousBroadcastActors
actor[] broadcastActors
actor[] actors
int numFoundActors

ReferenceAlias[] property ActorRefs auto
formlist property _AnimaRaceList auto

Event OnInit()
    numFoundActors = 0
    LogEvents()
EndEvent

Function LogEvents()
    While True
        FindAllNpcsInArea()
        AssignActorsToRefs()
        SendActors()
        Utility.Wait(7)
    EndWhile
EndFunction

Function FindAllNpcsInArea()
    actors = MiscUtil.ScanCellNPCs(Game.GetPlayer(), 700)
    broadcastActors = PapyrusUtil.ActorArray(actors.Length)
    int i = 0
    While i < actors.Length
        If !IsAvailable(actors[i])
            actors = PapyrusUtil.RemoveActor(actors, actors[i])
        Else
            i += 1
        EndIf
    EndWhile
    i = 0
    While i < previousBroadcastActors.Length
        bool found = false
        int j = 0
        While j < broadcastActors.Length
            If previousBroadcastActors[i] == broadcastActors[j]
                found = true
            EndIf
            j += 1
        EndWhile
        If !found
            AnimaSKSE.RemoveBroadcastActor(previousBroadcastActors[i])
        EndIf
        i += 1
    EndWhile
    i = 0
    int j = 0
    While i < actors.Length
        If IsAvailableForBroadcast(actors[i])
            broadcastActors[j] = actors[i]
            j += 1
        EndIf
        i += 1
    EndWhile
    previousBroadcastActors = PapyrusUtil.ActorArray(broadcastActors.Length)
    i = 0
    While i < broadcastActors.Length
        previousBroadcastActors[i] = broadcastActors[i]
        i += 1
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
    AnimaSKSE.ClearActors(actors.Length == 0)
    int i = 0
    While i < actors.Length
        If actors[i] != None
            Debug.Trace("Anima: SENDING ACTOR " + actors[i].GetDisplayName())
            AnimaSKSE.SendActor(actors[i], GetVoiceType(actors[i]), Game.GetPlayer().GetDistance(actors[i]) / 71, Utility.GameTimeToString(Utility.GetCurrentGameTime()))
        EndIf
        i += 1
    EndWhile
    i = 0
    While i < broadcastActors.Length
        If broadcastActors[i] != None && broadcastActors[i] != Game.GetPlayer()
            Debug.Trace("Anima: SENDING BROADCAST ACTOR " + broadcastActors[i].GetDisplayName())
            AnimaSKSE.SetBroadcastActor(broadcastActors[i], GetVoiceType(broadcastActors[i]), Game.GetPlayer().GetDistance(broadcastActors[i]) / 71)
        EndIf
        i += 1
    EndWhile
    Utility.Wait(0.1)
    AnimaSKSE.SendBroadcastActors(Utility.GameTimeToString(Utility.GetCurrentGameTime()))
EndFunction

string function GetVoiceType(Actor _actor)
    string str = _actor.GetVoiceType() as string
    int startIndex = StringUtil.Find(str, "<", 0)
    int endIndex = StringUtil.Find(str," ", startIndex)
    return StringUtil.Substring(str, startIndex + 1, endIndex - startIndex - 1)
endFunction

bool function IsRaceIncluded(Actor _actor) 
    return _AnimaRaceList.HasForm(_actor.GetRace())
endFunction

bool function IsAvailable(Actor _actor)
    return  IsRaceIncluded(_actor) && _actor.IsEnabled() && !_actor.isDead() && !_actor.IsUnconscious() && _actor.GetSleepState() == 0
endFunction

bool function IsAvailableForBroadcast(Actor _actor)
    return  IsRaceIncluded(_actor) && _actor.IsEnabled() && _actor.GetCurrentScene() == None && !_actor.isDead() && !_actor.IsUnconscious() && _actor.GetSleepState() == 0
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