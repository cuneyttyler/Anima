scriptname AnimaFollowerScript extends Quest

referencealias property Follower auto
referencealias property FollowerExtra1 auto
referencealias property FollowerExtra2 auto
referencealias property FollowerExtra3 auto
referencealias property FollowerExtra4 auto
referencealias property FollowerExtra5 auto

Event OnInit()
    Debug.Trace("Anima: AnimaFollowerScript:Init")
    Utility.Wait(5)
    While(true)
        AnimaSKSE.ClearFollowers()
        Utility.Wait(5)
        Actor _actor = Follower.GetActorRef()

        If _actor != None
            ; Debug.Trace("Anima: SENDING FOLLOWER: " + _actor.GetDisplayName())
            AnimaSKSE.SendFollower(_actor, GetVoiceType(_actor), Game.GetPlayer().GetDistance(_actor) / 71)
        EndIf
        
        _actor = FollowerExtra1.GetActorRef()
        If _actor != None
            ; Debug.Trace("Anima: SENDING FOLLOWER: " + _actor.GetDisplayName())
            AnimaSKSE.SendFollower(_actor, GetVoiceType(_actor), Game.GetPlayer().GetDistance(_actor) / 71)
        EndIf
        
        _actor = FollowerExtra2.GetActorRef()
        If _actor != None
            ; Debug.Trace("Anima: SENDING FOLLOWER: " + _actor.GetDisplayName())
            AnimaSKSE.SendFollower(_actor, GetVoiceType(_actor), Game.GetPlayer().GetDistance(_actor) / 71)
        EndIf
        
        _actor = FollowerExtra3.GetActorRef()
        If _actor != None
            ; Debug.Trace("Anima: SENDING FOLLOWER: " + _actor.GetDisplayName())
            AnimaSKSE.SendFollower(_actor, GetVoiceType(_actor), Game.GetPlayer().GetDistance(_actor) / 71)
        EndIf
        
        _actor = FollowerExtra4.GetActorRef()
        If _actor != None
            ; Debug.Trace("Anima: SENDING FOLLOWER: " + _actor.GetDisplayName())
            AnimaSKSE.SendFollower(_actor, GetVoiceType(_actor), Game.GetPlayer().GetDistance(_actor) / 71)
        EndIf
        
        _actor = FollowerExtra5.GetActorRef()
        If _actor != None
            ; Debug.Trace("Anima: SENDING FOLLOWER: " + _actor.GetDisplayName())
            AnimaSKSE.SendFollower(_actor, GetVoiceType(_actor), Game.GetPlayer().GetDistance(_actor) / 71)
        EndIf
        Utility.Wait(10)
    EndWhile
EndEvent

string function GetVoiceType(Actor _actor)
    string str = _actor.GetVoiceType() as string
    int startIndex = StringUtil.Find(str, "<", 0)
    int endIndex = StringUtil.Find(str," ", startIndex)
    return StringUtil.Substring(str, startIndex + 1, endIndex - startIndex - 1)
endFunction