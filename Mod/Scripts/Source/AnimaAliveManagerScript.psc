scriptname AnimaAliveManagerScript extends quest

referencealias property TriggerActor auto
package property AnimaForceGreetPlayerPackage auto
string property Text auto
float property Duration auto

Event OnInit()
    Debug.Trace("Anima: AliveManager Init")
    self.RegisterForModEvent("BLC_ForceGreetPlayer", "ForceGreetPlayer")
EndEvent

function ForceGreetPlayer(String eventName, String strArg, Float numArg, Form sender)
    Debug.Trace("Anima: Adding package override AnimaForceGreetPlayerPackage " + (sender as Actor).GetDisplayName())
    TriggerActor.ForceRefTo(sender as Actor)
    ActorUtil.AddPackageOverride(sender as Actor, AnimaForceGreetPlayerPackage, 1)
    text = strArg
    Duration = numArg
endFunction