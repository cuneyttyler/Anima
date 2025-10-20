Scriptname AnimaEventLogger extends Quest

actor[] previousBroadcastActors
actor[] broadcastActors
actor[] previousN2NActors
actor[] n2nBroadcastActors
actor[] previousActors
actor[] actors
int numFoundActors

ReferenceAlias[] property ActorRefs auto
formlist property _AnimaRaceList auto

int MAX_ACTORS = 6

Event OnInit()
    numFoundActors = 0
    LogEvents()
EndEvent

Function LogEvents()
    While True
        FindAllNpcsInArea()
        AssignActorsToRefs()
        RemoveNonExisting()
        SendActors()
        Utility.Wait(1)
    EndWhile
EndFunction

Function FindAllNpcsInArea()
    previousActors = CopyArray(actors)
    previousBroadcastActors = CopyArray(broadcastActors)
    previousN2NActors = CopyArray(n2nBroadcastActors)

    actors = MiscUtil.ScanCellNPCs(Game.GetPlayer(), 1400)
    n2nBroadcastActors = MiscUtil.ScanCellNPCs(Game.GetPlayer(), 1000)
    broadcastActors = MiscUtil.ScanCellNPCs(Game.GetPlayer(), 700)

    ; actors = SubArray(actors, MAX_ACTORS)
    ; n2nBroadcastActors = SubArray(n2nBroadcastActors, MAX_ACTORS)
    ; broadcastActors = SubArray(broadcastActors, MAX_ACTORS)

    ; int i = 0
    ; While i < actors.Length
    ;     If !IsAvailable(actors[i])
    ;         actors = PapyrusUtil.RemoveActor(actors, actors[i])
    ;     Else
    ;         i += 1
    ;     EndIf
    ; EndWhile
    ;  i = 0
    ;  While i < broadcastActors.Length
    ;     If !IsAvailableForBroadcast(broadcastActors[i])
    ;         broadcastActors = PapyrusUtil.RemoveActor(broadcastActors, broadcastActors[i])
    ;     Else
    ;         i += 1
    ;     EndIf
    ;  EndWhile
    ;  i = 0
    ;  While i < n2nBroadcastActors.Length
    ;      If !IsAvailableForBroadcast(n2nBroadcastActors[i])
    ;          n2nBroadcastActors = PapyrusUtil.RemoveActor(n2nBroadcastActors, n2nBroadcastActors[i])
    ;      Else
    ;          i += 1
    ;      EndIf
    ;  EndWhile
EndFunction

Actor[] Function SubArray(Actor[] _actors, int MAX_COUNT)
    If _actors.Length == 0
        Return PapyrusUtil.ActorArray(0)
    EndIf

    int i = 0
    float[] distances = PapyrusUtil.FloatArray(_actors.Length)
    While i < _actors.Length
        distances[i] = _actors[i].GetDistance(Game.GetPlayer())  
        i += 1
    EndWhile

    float[] sortedDistances = PapyrusUtil.FloatArray(_actors.Length)
    i = 0
    While i < _actors.Length
        sortedDistances[i] = distances[i]
        i += 1
    EndWhile
    PapyrusUtil.SortFloatArray(sortedDistances)

    i = 0
    int[] indexes = PapyrusUtil.IntArray(_actors.Length)
    While i < _actors.Length
        int index = -1
        int j = 0
        While j < _actors.Length && index == -1
            If sortedDistances[i] == distances[j]
                index = j
            EndIf
            j += 1
        EndWhile
        indexes[i] = index
        i += 1
    EndWhile

    int count = _actors.Length
    If _actors.Length > MAX_COUNT
        count = MAX_COUNT
    EndIf
    Actor[] filteredActors = PapyrusUtil.ActorArray(count)
    i = 0
    While i < count
        filteredActors[i] = _actors[indexes[i]]
        i += 1
    EndWhile 

    Return filteredActors
EndFunction

Function AssignActorsToRefs()
    int i = 0
    While i < actors.Length
        If actors[i] != None && i < ActorRefs.Length
            ActorRefs[i].ForceRefTo(actors[i])
        EndIf
        i += 1
    EndWhile
EndFunction

Function RemoveNonExisting()
    int i = 0
    While i < previousActors.Length
        If !IsInArray(previousActors[i], actors)
            AnimaSKSE.RemoveActor(previousActors[i])
        EndIf
        i += 1
    EndWhile
    i = 0
    While i < previousBroadcastActors.Length
        If !IsInArray(previousBroadcastActors[i], broadcastActors)
            AnimaSKSE.RemoveBroadcastActor(previousBroadcastActors[i])
            If previousBroadcastActors[i] != None
                AnimaSKSE.StopBroadcast(previousBroadcastActors[i])
            EndIf
        EndIf
        i += 1
    EndWhile
    i = 0
    While i < previousN2NActors.Length
        If !IsInArray(previousN2NActors[i], n2nBroadcastActors)
            AnimaSKSE.RemoveN2NActor(previousN2NActors[i])
            If previousN2NActors[i] != None
                AnimaSKSE.StopBroadcast(previousN2NActors[i])
            EndIf
        EndIf
        i += 1
    EndWhile
EndFunction

Function SendActors()
    int i = 0
    While i < actors.Length
        If actors[i] != None && actors[i].GetDisplayName() != ""
            AnimaSKSE.SendActor(actors[i], GetVoiceType(actors[i]), Game.GetPlayer().GetDistance(actors[i]) / 71, Utility.GameTimeToString(Utility.GetCurrentGameTime()))
        EndIf
        i += 1
    EndWhile
    i = 0
    While i < broadcastActors.Length
        If broadcastActors[i] != None && broadcastActors[i] != Game.GetPlayer() && broadcastActors[i].GetDisplayName() != ""
            AnimaSKSE.SetBroadcastActor(broadcastActors[i], GetVoiceType(broadcastActors[i]), Game.GetPlayer().GetDistance(broadcastActors[i]) / 71)
        EndIf
        i += 1
    EndWhile
    i = 0
    While i < n2nBroadcastActors.Length
        If n2nBroadcastActors[i] != None && n2nBroadcastActors[i] != Game.GetPlayer() && n2nBroadcastActors[i].GetDisplayName() != ""
            AnimaSKSE.SetN2NBroadcastActor(n2nBroadcastActors[i], GetVoiceType(n2nBroadcastActors[i]), Game.GetPlayer().GetDistance(n2nBroadcastActors[i]) / 71)
        EndIf
        i += 1
    EndWhile
    AnimaSKSE.SendBroadcastActors(Utility.GameTimeToString(Utility.GetCurrentGameTime()))
    AnimaSKSE.SendN2NBroadcastActors(Utility.GameTimeToString(Utility.GetCurrentGameTime()))
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
    return IsRaceIncluded(_actor) && _actor.IsEnabled() && !_actor.isDead() && !_actor.IsUnconscious() && _actor.GetSleepState() == 0
endFunction

bool function IsAvailableForBroadcast(Actor _actor)
    return  IsRaceIncluded(_actor) && _actor.IsEnabled() && !_actor.isDead() && !_actor.IsUnconscious() && _actor.GetSleepState() == 0
endFunction

Actor[] Function CopyArray(Actor[] arr)
    Actor[] target = PapyrusUtil.ActorArray(arr.Length)
    int i = 0
    While i < arr.Length
        target[i] = arr[i]
        i += 1
    EndWhile
    
    return target
EndFunction

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