Scriptname AnimaCollegeBookScript extends ObjectReference  

Event OnRead()
	If MG02.GetStage() < 200
		Return
	EndIf

	If AnimaCollegeLectures.GetStage() > 0
		Return
	EndIf

	AnimaCollegeLectures.Start()
	AnimaCollegeLectures.SetStage(5)
EndEvent
Quest Property AnimaCollegeLectures  Auto  

Quest Property MG02  Auto  
