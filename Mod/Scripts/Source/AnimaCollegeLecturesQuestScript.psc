scriptname AnimaCollegeLecturesQuestScript extends Quest

GlobalVariable property AnimaCollegeLectureOngoing auto
GlobalVariable property AnimaCollegeLectureOngoing_2 auto

Event OnInit()
    Debug.Trace("Anima:CollegeLectures:Init")
    self.RegisterForModEvent("BLC_EndLecture", "EndLecture")
EndEvent

Function EndLecture()
    If AnimaCollegeLectureOngoing.GetValueInt() == 1
        AnimaCollegeLectureOngoing.SetValueInt(0)
    ElseIf AnimaCollegeLectureOngoing_2.GetValueInt() == 1
        AnimaCollegeLectureOngoing_2.SetValueInt(0)
    EndIf
    SetVars()
EndFunction

Function SetVars()
   (AnimaCollegeLectureStartTrigger  as AnimaCollegeLecturesTriggerScript).isJzargo = false
   (AnimaCollegeLectureStartTrigger  as AnimaCollegeLecturesTriggerScript).isOnmund = false
   (AnimaCollegeLectureStartTrigger  as AnimaCollegeLecturesTriggerScript).isBrelyna = false
   (AnimaCollegeLectureStartTrigger  as AnimaCollegeLecturesTriggerScript).isTeacher = false
EndFunction

ObjectReference Property AnimaCollegeLectureStartTrigger  Auto  
