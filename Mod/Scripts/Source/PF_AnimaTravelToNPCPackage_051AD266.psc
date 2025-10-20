;BEGIN FRAGMENT CODE - Do not edit anything between this and the end comment
;NEXT FRAGMENT INDEX 4
Scriptname PF_AnimaTravelToNPCPackage_051AD266 Extends Package Hidden

;BEGIN FRAGMENT Fragment_1
Function Fragment_1(Actor akActor)
;BEGIN CODE
Debug.Trace("** Anima ** TravelToNpcPackage End")
AnimaSKSE.N2N_Start(Utility.GameTimeToString(Utility.GetCurrentGameTime()))
ActorUtil.AddPackageOverride(n2n_SourceRefAlias.GetActorRef(), AnimaStandPackage,1)
n2n_SourceRefAlias.GetActorRef().EvaluatePackage()
ActorUtil.AddPackageOverride(n2n_TargetRefAlias.GetActorRef(), AnimaStandPackage,1)
n2n_TargetRefAlias.GetActorRef().EvaluatePackage()
n2n_sourceRefAlias.GetActorRef().SetLookAt(n2n_TargetRefAlias.GetActorRef())
n2n_targetRefAlias.GetActorRef().SetLookAt(n2n_SourceRefAlias.GetActorRef())
N2N_ConversationOnGoing.SetValue(1)
N2N_LastSuccessfulStart.SetValueInt((Utility.GetCurrentRealTime() as int) % 1000)
;END CODE
EndFunction
;END FRAGMENT

;BEGIN FRAGMENT Fragment_3
Function Fragment_3(Actor akActor)
;BEGIN CODE
Debug.Trace("** Anima ** TravelToNpcPackage Begin")
;END CODE
EndFunction
;END FRAGMENT

;BEGIN FRAGMENT Fragment_2
Function Fragment_2(Actor akActor)
;BEGIN CODE
Debug.Trace("** Anima ** TravelToNpcPackage Change")
;END CODE
EndFunction
;END FRAGMENT

;END FRAGMENT CODE - Do not edit anything between this and the begin comment

ReferenceAlias Property n2n_SourceRefAlias  Auto  

ReferenceAlias Property n2n_TargetRefAlias  Auto  

Package Property AnimaStandPackage  Auto  

GlobalVariable Property N2N_ConversationOnGoing  Auto  

GlobalVariable Property N2N_LastSuccessfulStart  Auto  
