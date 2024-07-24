;BEGIN FRAGMENT CODE - Do not edit anything between this and the end comment
;NEXT FRAGMENT INDEX 3
Scriptname PF_AnimaTravelToNPCPackage_051AD266 Extends Package Hidden

;BEGIN FRAGMENT Fragment_0
Function Fragment_0(Actor akActor)
;BEGIN CODE
Debug.Trace("Anima: TravelPackage Begin")
;END CODE
EndFunction
;END FRAGMENT

;BEGIN FRAGMENT Fragment_2
Function Fragment_2(Actor akActor)
;BEGIN CODE
Debug.Trace("Anima: TravelPackage Change")
AnimaSKSE.N2N_Start(Utility.GameTimeToString(Utility.GetCurrentGameTime()))
ActorUtil.AddPackageOverride(n2n_SourceRefAlias.GetActorRef(), AnimaStandPackage,1)
n2n_SourceRefAlias.GetActorRef().EvaluatePackage()
ActorUtil.AddPackageOverride(n2n_TargetRefAlias.GetActorRef(), AnimaStandPackage,1)
n2n_TargetRefAlias.GetActorRef().EvaluatePackage()
n2n_sourceRefAlias.GetActorRef().SetLookAt(n2n_TargetRefAlias.GetActorRef())
n2n_targetRefAlias.GetActorRef().SetLookAt(n2n_SourceRefAlias.GetActorRef())
;END CODE
EndFunction
;END FRAGMENT

;BEGIN FRAGMENT Fragment_1
Function Fragment_1(Actor akActor)
;BEGIN CODE
Debug.Trace("Anima: TravelPackage End")
AnimaSKSE.N2N_Start(Utility.GameTimeToString(Utility.GetCurrentGameTime()))
ActorUtil.AddPackageOverride(n2n_SourceRefAlias.GetActorRef(), AnimaStandPackage,1)
n2n_SourceRefAlias.GetActorRef().EvaluatePackage()
ActorUtil.AddPackageOverride(n2n_TargetRefAlias.GetActorRef(), AnimaStandPackage,1)
n2n_TargetRefAlias.GetActorRef().EvaluatePackage()
n2n_sourceRefAlias.GetActorRef().SetLookAt(n2n_TargetRefAlias.GetActorRef())
n2n_targetRefAlias.GetActorRef().SetLookAt(n2n_SourceRefAlias.GetActorRef())
;END CODE
EndFunction
;END FRAGMENT

;END FRAGMENT CODE - Do not edit anything between this and the begin comment

ReferenceAlias Property n2n_SourceRefAlias  Auto  

ReferenceAlias Property n2n_TargetRefAlias  Auto  

Package Property AnimaStandPackage  Auto  
