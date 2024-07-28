Scriptname AnimaActorEventLogger extends ReferenceAlias  

ReferenceAlias[] property ActorRefs auto

int lastHitTime
int lastBowShotTime

Event OnCombatStateChanged(Actor akTarget, int aeCombatState)
    Actor[] actors = GetRefsAsActors()
    int i = 0
    i = 0
    While i < 20
        if (aeCombatState == 0)
            AnimaSKSE.LogEvent(actors[i], CurrentTimeString() + self.GetActorRef().GetDisplayName() + " has left combat. " )
        elseif (aeCombatState == 1)
            AnimaSKSE.LogEvent(actors[i], CurrentTimeString() + self.GetActorRef().GetDisplayName() + " have entered combat with " + akTarget.GetDisplayName() + ". ")
        elseif (aeCombatState == 2)
            AnimaSKSE.LogEvent(actors[i], CurrentTimeString() + self.GetActorRef().GetDisplayName() + " is searching for " + akTarget.GetDisplayName() + ". ")
        endIf
        i += 1
    EndWhile
endEvent

Event OnDeath(Actor akKiller)
    Actor[] actors = GetRefsAsActors()
    int i = 0
    While i < 20
        AnimaSKSE.LogEvent(actors[i], CurrentTimeString() + self.GetActorRef().GetDisplayName() + " is killed by " + akKiller.GetDisplayName() + ". ")
        i += 1
    EndWhile
EndEvent

Event OnDying(Actor akKiller)
    Actor[] actors = GetRefsAsActors()
    int i = 0
    While i < 20
        AnimaSKSE.LogEvent(actors[i], CurrentTimeString() + self.GetActorRef().GetDisplayName() + " is about to be killed by " + akKiller.GetDisplayName() + ". ")
        i += 1
    EndWhile
EndEvent

Event OnBleedOut()
    Actor[] actors = GetRefsAsActors()
    int i = 0
    While i < 20
        AnimaSKSE.LogEvent(actors[i], CurrentTimeString() + self.GetActorRef().GetDisplayName() + " has entered bleedout. ")
        i += 1
    EndWhile
EndEvent

Event OnPlayerBowShot(Weapon akWeapon, Ammo akAmmo, Float afPower, Bool abSunGazing)
    int timer = Utility.GetCurrentRealTime() as int
    timer = timer % 1000

    Actor[] actors = GetRefsAsActors()
    If timer - lastBowShotTime > 30
        int i = 0
        While i < 20
            AnimaSKSE.LogEvent(actors[i], CurrentTimeString() + self.GetActorRef().GetDisplayName() + " has shoot an arrow. ")
            i += 1
        EndWhile
        lastBowShotTime = timer
    EndIf
EndEvent

Event OnHit(ObjectReference akAggressor, Form akSource, Projectile akProjectile, Bool abPowerAttack, Bool abSneakAttack, Bool abBashAttack, Bool abHitBlocked)
    If akAggressor == None || akAggressor.GetDisplayName() == ""
        Return
    EndIf

    int timer = Utility.GetCurrentRealTime() as int
    timer = timer % 1000
    
    Actor[] actors = GetRefsAsActors()
    If timer - lastHitTime > 30
        int i = 0
        While i < 20
            AnimaSKSE.LogEvent(actors[i], CurrentTimeString() + self.GetActorRef().GetDisplayName() + " got hit by " + akAggressor.GetDisplayName() + ". ")
            i += 1
        EndWhile
        lastHitTime = timer
    EndIf
EndEvent

Actor[] Function GetRefsAsActors()
    Actor[] actors = new Actor[10]
    int i = 0
    While i < 10
        If ActorRefs[i] != None
            actors[i] = ActorRefs[i].GetActorRef()
        EndIf
        i += 1
    EndWhile

    Return actors
EndFunction

String Function CurrentTimeString()
    Return "On " + Utility.GameTimeToString(Utility.GetCurrentGameTime()) + ", "
EndFunction