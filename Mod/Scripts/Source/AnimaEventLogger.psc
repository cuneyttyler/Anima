Scriptname AnimaEventLogger extends Quest

actor[] broadcastActors
actor[] n2nBroadcastActors
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
        Utility.Wait(1)
    EndWhile
EndFunction

Function FindAllNpcsInArea()
    actors = MiscUtil.ScanCellNPCs(Game.GetPlayer(), 1400)
    n2nBroadcastActors = MiscUtil.ScanCellNPCs(Game.GetPlayer(), 1000)
    broadcastActors = MiscUtil.ScanCellNPCs(Game.GetPlayer(), 400)
    int i = 0
    While i < actors.Length
        Debug.Trace(actors[i].GetDisplayName())
        If !IsAvailable(actors[i])
            actors = PapyrusUtil.RemoveActor(actors, actors[i])
        Else
            i += 1
        EndIf
    EndWhile
     i = 0
     While i < broadcastActors.Length
        Debug.Trace(broadcastActors[i].GetDisplayName())
        If !IsAvailableForBroadcast(broadcastActors[i])
            broadcastActors = PapyrusUtil.RemoveActor(broadcastActors, broadcastActors[i])
        Else
            i += 1
        EndIf
     EndWhile
     i = 0
     While i < n2nBroadcastActors.Length
         If !IsAvailableForBroadcast(n2nBroadcastActors[i])
             n2nBroadcastActors = PapyrusUtil.RemoveActor(n2nBroadcastActors, n2nBroadcastActors[i])
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
    AnimaSKSE.ClearActors(actors.Length == 0)
    int i = 0
    While i < actors.Length
        If actors[i] != None
            AnimaSKSE.SendActor(actors[i], GetVoiceType(actors[i]), Game.GetPlayer().GetDistance(actors[i]) / 71, Utility.GameTimeToString(Utility.GetCurrentGameTime()))
        EndIf
        i += 1
    EndWhile
    i = 0
    While i < broadcastActors.Length
        If broadcastActors[i] != None && broadcastActors[i] != Game.GetPlayer()
            AnimaSKSE.SetBroadcastActor(broadcastActors[i], GetVoiceType(broadcastActors[i]), Game.GetPlayer().GetDistance(broadcastActors[i]) / 71)
        EndIf
        i += 1
    EndWhile
    i = 0
    While i < n2nBroadcastActors.Length
        If n2nBroadcastActors[i] != None && n2nBroadcastActors[i] != Game.GetPlayer()
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