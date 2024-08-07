scriptname AnimaSKSE hidden

bool function Start(Actor target, string voiceType, string gameTime) global native
bool function Stop() global native
bool function N2N_Initiate(Actor source, Actor target, string sourceVoiceType, string targetVoiceType, string currentDateTime) global native
bool function N2N_Start(string gameTime) global native
bool function N2N_Stop() global native
bool function LogEvent(Actor actor, string log) global native
bool function WatchSubtitles() global native
bool function ClearActors(bool empty) global native
bool function SendActor(Actor actor, string voice, float distance, string currentDateTime) global native
bool function SetBroadcastActor(Actor actor, string voice, float distance) global native
bool function SendBroadcastActors(string currentDateTime) global native
bool function SetN2NBroadcastActor(Actor actor, string voice, float distance) global native
bool function SendN2NBroadcastActors(string currentDateTime) global native
bool function RemoveActor(Actor actor) global native
bool function RemoveBroadcastActor(Actor actor) global native
bool function RemoveN2NActor(Actor actor) global native
bool function StopBroadcast(Actor actor) global native
bool function SendResponseLog(Actor actor, string message) global native
bool function ClearFollowers() global native
bool function SendFollower(Actor actor, string voice, float distance) global native
bool function StartLecture(Actor actor, String actorVoiceType, int lectureNo, int lectureIndex, string currentDateTime) global native
bool function EndLecture() global native
bool function OpenTextBox() global native
bool function ShowForceGreetSubtitles(string subtitle, float duration) global native