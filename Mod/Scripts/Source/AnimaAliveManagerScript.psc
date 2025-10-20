scriptname AnimaAliveManagerScript extends quest

referencealias property TriggerActor auto
package property AnimaForceGreetPlayerPackage auto
string property Text auto
float property Duration auto

Event OnInit()
    Debug.Trace("** Anima ** AliveManager Init")
    self.RegisterForModEvent("BLC_ForceGreetPlayer", "ForceGreetPlayer")
EndEvent

function ForceGreetPlayer(String eventName, String strArg, Float numArg, Form sender)
    Debug.Trace("** Anima ** Adding set ref to TriggerActor " + (sender as Actor).GetDisplayName())
    TriggerActor.ForceRefTo(sender as Actor)
    Duration = numArg
    Utility.Wait(Duration + 5)
    TriggerActor.Clear()
endFunction