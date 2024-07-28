Scriptname AnimaCollegeLecturesTriggerScript extends ObjectReference

bool property isJzargo auto
bool property isOnmund auto
bool property isBrelyna auto
bool property isTeacher auto

Event OnTriggerEnter(ObjectReference akActionRef)
	If AnimaCollegeLectureOngoing.GetValueInt() == 0 && AnimaCollegeLectureOngoing_2.GetValueInt() == 0
		Return
	EndIf
	If akActionRef as Actor == Jzargo.GetActorRef()
		isJzargo = true
	EndIf
	If akActionRef as Actor == Onmund.GetActorRef()
		isOnmund = true
	EndIf
	If akActionRef as Actor == Brelyna.GetActorRef()
		isBrelyna = true
	EndIf
	If akActionRef as Actor == CurrentTeacher.GetActorRef()
		isTeacher = true
	EndIf
	If isJzargo && isOnmund && isBrelyna && isTeacher
		While CurrentTeacher.GetActorRef().GetCurrentLocation() != Game.GetPlayer().GetCurrentLocation() &&  (AnimaCollegeLectureOngoing.GetValueInt() == 1 || AnimaCollegeLectureOngoing_2.GetValueInt() == 1)
			; idle wait
		EndWhile
		If (AnimaCollegeLectureOngoing.GetValueInt() == 1 || AnimaCollegeLectureOngoing_2.GetValueInt() == 1) && AnimaCollegeLectureStarted.GetValueInt() == 0
			AnimaSKSE.StartLecture(CurrentTeacher.GetActorRef(), _GetVoiceType(CurrentTeacher.GetActorRef()), AnimaCurrentLecture.GetValueInt(), AnimaLectureIndex.GetValueInt(), Utility.GameTimeToString(Utility.GetCurrentGameTime()))
			AnimaCollegeLectureStarted.SetValueInt(1)
		EndIf
	EndIf
EndEvent

string function _GetVoiceType(Actor _actor)
	string str = _actor.GetVoiceType() as string
    int startIndex = StringUtil.Find(str, "<", 0)
    int endIndex = StringUtil.Find(str," ", startIndex)
    return StringUtil.Substring(str, startIndex + 1, endIndex - startIndex - 1)
EndFunction

ReferenceAlias Property Jzargo Auto  

ReferenceAlias Property Onmund  Auto  

ReferenceAlias Property Brelyna Auto  

ReferenceAlias Property CurrentTeacher  Auto  

GlobalVariable Property AnimaLectureIndex Auto

GlobalVariable Property AnimaCurrentLecture Auto

GlobalVariable Property AnimaCollegeLectureOngoing  Auto  

GlobalVariable Property AnimaCollegeLectureOngoing_2  Auto  

GlobalVariable Property AnimaCollegeLectureStarted  Auto  
