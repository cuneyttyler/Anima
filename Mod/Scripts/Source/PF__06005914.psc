;BEGIN FRAGMENT CODE - Do not edit anything between this and the end comment
;NEXT FRAGMENT INDEX 7
Scriptname PF__06005914 Extends Package Hidden

;BEGIN FRAGMENT Fragment_6
Function Fragment_6(Actor akActor)
;BEGIN CODE
Debug.Trace("Anima: Lecture End")
ActorUtil.AddPackageOverride(Phinis.GetActorRef(), AnimaPhinisEndLecturePackage, 1)
;END CODE
EndFunction
;END FRAGMENT

;BEGIN FRAGMENT Fragment_5
Function Fragment_5(Actor akActor)
;BEGIN CODE
Debug.Trace("Anima: Lecture End")
ActorUtil.AddPackageOverride(Phinis.GetActorRef(), AnimaPhinisEndLecturePackage, 1)
;END CODE
EndFunction
;END FRAGMENT

;BEGIN FRAGMENT Fragment_2
Function Fragment_2(Actor akActor)
;BEGIN CODE
AnimaCollegeLectures.SetStage(80)
;END CODE
EndFunction
;END FRAGMENT

;END FRAGMENT CODE - Do not edit anything between this and the begin comment

Quest Property AnimaCollegeLectures  Auto  

Package Property AnimaPhinisEndLecturePackage  Auto  

ReferenceAlias Property Phinis  Auto  
