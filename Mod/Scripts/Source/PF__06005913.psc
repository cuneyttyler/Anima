;BEGIN FRAGMENT CODE - Do not edit anything between this and the end comment
;NEXT FRAGMENT INDEX 5
Scriptname PF__06005913 Extends Package Hidden

;BEGIN FRAGMENT Fragment_2
Function Fragment_2(Actor akActor)
;BEGIN CODE
AnimaCollegeLectures.SetStage(70)
;END CODE
EndFunction
;END FRAGMENT

;BEGIN FRAGMENT Fragment_3
Function Fragment_3(Actor akActor)
;BEGIN CODE
AnimaCollegeLectureEnding.SetValueInt(1)
;END CODE
EndFunction
;END FRAGMENT

;BEGIN FRAGMENT Fragment_4
Function Fragment_4(Actor akActor)
;BEGIN CODE
AnimaCollegeLectureEnding.SetValueInt(1)
;END CODE
EndFunction
;END FRAGMENT

;END FRAGMENT CODE - Do not edit anything between this and the begin comment

GlobalVariable Property AnimaCollegeLectureStart  Auto  

Quest Property AnimaCollegeLectures  Auto  

GlobalVariable Property AnimaCollegeLectureEnding  Auto  
