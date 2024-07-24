scriptname AnimaFollowerManagerScript extends Quest

GlobalVariable property nwsAllowSandbox auto

Event OnInit()
    self.RegisterForModEvent("BLC_FollowerCommand", "FollowerCommand")
    Debug.Trace("AnimaFollowerManager initialized.")
EndEvent

Function FollowerCommand(String eventName, String strArg, Float numArg, Form sender)
    If strArg == "stay-close"
        nwsAllowSandbox.SetValueInt(0)
    ElseIf strArg == "relax"
        nwsAllowSandbox.SetValueInt(1)
    EndIf
EndFunction