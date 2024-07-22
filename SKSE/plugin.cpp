#include <cpr/cpr.h>

#include <nlohmann/json.hpp>
#include <sstream>
#include <string>
#include <thread>
#include <websocketpp/client.hpp>
#include <websocketpp/config/asio_no_tls_client.hpp>[
#include <iostream>
#include <future>
#include <thread>
#include <chrono>
#include <boost/shared_ptr.hpp>
#include <algorithm>

#include "PhonemeUtility.cpp"

using namespace RE::BSScript;
using json = nlohmann::json;
using namespace std;

static class AnimaUtility {
public:
    static const void StartQuest(const char* questName) {
        auto quest = RE::TESForm::LookupByEditorID<RE::TESQuest>(questName);
        if (quest) quest->Start();
    }

    static const void MoveQuestToStage(const char* questName, int stage) {
        auto quest = RE::TESForm::LookupByEditorID<RE::TESQuest>(questName);
        if (quest) {
            quest->currentStage = stage;
            quest->GetMustUpdate();
        }
    }
};

static class Util {
public:
    inline static int LOG_LEVEL = 3;
    inline static uint32_t speakerNameColor;

    static void GetSettings() {
        auto iniSettings = RE::INISettingCollection::GetSingleton();
        speakerNameColor = iniSettings->GetSetting("iSubtitleSpeakerNameColor:Interface")->GetUInt();
    }

    static std::string GetActorName(RE::Actor* actor) {
        if (actor == nullptr) {
            return "";
        }

        try {
            string name = actor->GetName();
            if (name.length() > 0) {
                return name;
            }

            if (auto actorBase = actor->GetActorBase(); actorBase) {
                if (actorBase->shortName.size() > 0) {
                    return actorBase->shortName.c_str();
                }
            }

            return "";
        } catch (const exception& e) {
            Util::WriteLog("Exception during ==GetActorName==: " + string(e.what()), 1);
            return "";
        } catch (...) {
            Util::WriteLog("Unkown exception during ==GetActorName==", 1);
            return "";
        }
    }

    static int TimeDiffInSeconds(std::chrono::high_resolution_clock::time_point start,
                                 std::chrono::high_resolution_clock::time_point end) {
        auto duration = std::chrono::duration_cast<std::chrono::seconds>(end - start);
        return duration.count();
    }

    template <typename K, typename V>
    static K GetKeyAtIndex(map<K, V>& mapRef, int index) {
        for (const auto& entry : mapRef) {
            if (index == 0) {
                return entry.first;
            }
            index--;
        }

        return nullptr;
    }

    template <typename K, typename V>
    static V GetValueAtIndex(map<K, V>& mapRef, int index) {
        for (const auto& entry : mapRef) {
            if (index == 0) {
                return entry.second;
            }
            index--;
        }

        V defaultValue;
        return defaultValue;
    }

    static std::string toLower(std::string s) {
        for (char& c : s) c = tolower(c);
        return s;
    }

    static vector<string> split(const string& str, const string& delim) {
        vector<string> result;
        size_t start = 0;

        for (size_t found = str.find(delim); found != string::npos; found = str.find(delim, start)) {
            result.emplace_back(str.begin() + start, str.begin() + found);
            start = found + delim.size();
        }
        if (start != str.size()) result.emplace_back(str.begin() + start, str.end());
        return result;
    }

    static void ConsoleLog(std::string log) { RE::ConsoleLog::GetSingleton()->Print(log.c_str()); }
    
    static void WriteLog(const std::string& message, int level = 3) {
        if (level > LOG_LEVEL) {
            return;
        }

        std::string levelStr = "";
        switch (level) {
            case 1:
                levelStr = "ERROR: ";
                break;
            case 2:
                levelStr = "WARNING: ";
                break;
            case 3:
                levelStr = "INFO: ";
                break;
            case 4:
                levelStr = "DEBUG: ";
                break;
        }

        std::ofstream logFile("Anima.log", std::ios::app);
        if (logFile.is_open()) {
            logFile << levelStr + message << std::endl;
            logFile.close();
        }
    }

    static std::string trim(std::string str) { return std::regex_replace(str, std::regex{R"(^\s+|\s+$)"}, ""); }
};

class Follower {
public:
    Follower(RE::Actor* actor, const string& voiceType, const float& distance)
        : actor(actor), voiceType(voiceType), distance(distance) {}

    RE::Actor* actor;
    string voiceType;
    float distance;
};

using namespace RE::BSScript;
using namespace std;

static class SubtitleManager {
public:
    inline static std::mutex m;
    inline static bool HideSignal = false;

    static RE::SubtitleInfo* GetSubtitle(RE::Actor* actor, string subtitle) {
        RE::SubtitleInfo* subtitleInfo = new RE::SubtitleInfo();
        subtitleInfo->forceDisplay = 1;
        subtitleInfo->pad04 = 0;
        subtitleInfo->speaker = actor;
        subtitleInfo->subtitle = subtitle;
        subtitleInfo->targetDistance = 140;

        return subtitleInfo;
    }

    static bool CheckNewSubtitle(RE::SubtitleInfo* subtitleInfo) {
        int index = 0;
        int equalIndex = -1;
        for (RE::SubtitleInfo info : RE::SubtitleManager::GetSingleton()->subtitles) {
            if (string(info.subtitle) != "..." && string(info.subtitle) == string(subtitleInfo->subtitle)) {
                equalIndex = index;
            }
            index++;
        }

        if (equalIndex != -1 && index > equalIndex) {
            Util::WriteLog("NEW_SUBTITLE_FOUND " + string(RE::SubtitleManager::GetSingleton()->subtitles[index-1].subtitle));
        }

        return index > equalIndex;
    }

    static void ShowSubtitle(RE::Actor* actor, string subtitle, float duration) {
        try {
            Util::WriteLog("SHOW_SUBTITLE " + subtitle);
            RE::SubtitleInfo* subtitleInfo = GetSubtitle(actor, subtitle);
            RE::SubtitleManager::GetSingleton()->subtitles.push_back(*subtitleInfo);
            this_thread::sleep_for(chrono::milliseconds(((long)duration * 1000)));
            if (!CheckNewSubtitle(subtitleInfo)) {
                RE::SubtitleInfo* emptySubtitleInfo = GetSubtitle(actor, "==EMPTY_SUBTITLE==");
                RE::SubtitleManager::GetSingleton()->subtitles.push_back(*emptySubtitleInfo);
            }
        } catch (const exception& e) {
            Util::WriteLog("Exception during ==ShowSubtitle==: " + string(e.what()), 1);
        } catch (...) {
            Util::WriteLog("Unknown exception during ==ShowSubtitle==.", 1);
        }
    }

    static void HideSubtitle() {
        m.lock();

        try {
            auto hudMenu = RE::UI::GetSingleton()->GetMenu<RE::HUDMenu>(RE::HUDMenu::MENU_NAME);
            auto root = hudMenu->GetRuntimeData().root;
            root.Invoke("HideSubtitle", nullptr, nullptr, 0);
        } catch (const exception& e) {
            Util::WriteLog("Exception during ==HideSubtitle==: " + string(e.what()), 1);
        } catch (...) {
            Util::WriteLog("Unknown exception during ==HideSubtitle==.", 1);
        }

        m.unlock();
    }
};

class ActorData {
public:
    ActorData(const string voice, const float distance) : voice(voice), distance(distance) {}

    string voice;
    float distance;

};
static class AnimaCaller {
public:
    inline static RE::Actor* conversationActor;
    inline static bool conversationOngoing = false;
    inline static bool stopSignal = false;
    inline static bool connecting = false;
    inline static RE::Actor* N2N_SourceActor;
    inline static RE::Actor* N2N_TargetActor;
    inline static map<RE::Actor*, ActorData*> broadcastActors;
    inline static map<RE::Actor*, float> distances;
    inline static set<RE::Actor*> cellActors;
    inline static vector<Follower*> followers;
    inline static string currentDateTime;
    inline static int MAX_BROADCAST_SPEAKER_COUNT = 15;

    static std::string DisplayMessage(std::string str, int fontSize, int width) {
        std::stringstream ss(str);
        std::string word;
        std::string combined = "";
        std::string tracker = "";

        while (ss >> word) {
            if (((tracker.length() + word.length()) * fontSize) >= width) {
                combined += ";;;" + word;
                tracker = " " + word;
            } else {
                combined += " " + word;
                tracker += " " + word;
            }
        }
         
        return combined;
    }

    static void ShowReplyMessage(std::string message) {
        auto messageNew = DisplayMessage(message, 22, 1920);
        SKSE::ModCallbackEvent modEvent{"BLC_ShowNotification", messageNew, 5.0f, nullptr};
        SKSE::GetModCallbackEventSource()->SendEvent(&modEvent);
    }

    static void SetHoldPosition(int set, RE::Actor* actor) {
        SKSE::ModCallbackEvent modEvent{"BLC_SetHoldPosition", "", set, actor};
        SKSE::GetModCallbackEventSource()->SendEvent(&modEvent);
    }

    static void N2N_Init() {
        Util::WriteLog("Starting dialogue between " + Util::GetActorName(AnimaCaller::N2N_SourceActor) + " and " +
                        Util::GetActorName(AnimaCaller::N2N_TargetActor) + ".", 3);
        SKSE::ModCallbackEvent modEvent{"BLC_Start_N2N", "", 1.0f, nullptr};
        SKSE::GetModCallbackEventSource()->SendEvent(&modEvent);
        N2N_Init_Source();
        N2N_Init_Target();
    }

    static void N2N_Init_Source() {
        SKSE::ModCallbackEvent modEvent{"BLC_Start_N2N_Source", "", 1.0f, AnimaCaller::N2N_SourceActor};
        SKSE::GetModCallbackEventSource()->SendEvent(&modEvent);
    }

    static void N2N_Init_Target() {
        SKSE::ModCallbackEvent modEvent{"BLC_Start_N2N_Target", "", 1.0f, AnimaCaller::N2N_TargetActor};
        SKSE::GetModCallbackEventSource()->SendEvent(&modEvent);
    }

    static void Start(RE::Actor* actor) {
        Util::WriteLog("Starting dialogue with " + Util::GetActorName(actor) + ".", 3);
        SKSE::ModCallbackEvent modEvent{"BLC_Start", "", 1.0f, actor};
        SKSE::GetModCallbackEventSource()->SendEvent(&modEvent);
        AnimaCaller::conversationActor = actor;
        AnimaCaller::connecting = true;
    }

    static void Stop() {
        Util::WriteLog("Stopping dialogue with " + Util::GetActorName(AnimaCaller::conversationActor) + ".", 3);
        SKSE::ModCallbackEvent modEvent{"BLC_Stop", "", 1.0f, nullptr};
        SKSE::GetModCallbackEventSource()->SendEvent(&modEvent);
        SetHoldPosition(1, AnimaCaller::conversationActor);
        AnimaCaller::stopSignal = false;
        AnimaCaller::connecting = false;
        AnimaCaller::conversationOngoing = false;
        AnimaCaller::conversationActor = nullptr;
    }

    static void StopBroadcastForSpeaker(int formId) {
        RE::Actor* actor = RE::TESForm::LookupByID<RE::Actor>(RE::FormID(formId));
        Util::WriteLog("Stopping broadcast for " + string(actor->GetName()));
        SKSE::ModCallbackEvent modEvent{"BLC_Stop_Broadcast", "", 0, actor};
        SKSE::GetModCallbackEventSource()->SendEvent(&modEvent);
    }

    static void Reset() {
        AnimaCaller::conversationActor = nullptr;
        AnimaCaller::connecting = false;
    }

    static void SendFollowRequestAcceptedSignal() {
        SKSE::ModCallbackEvent modEvent{"BLC_Follow_Request_Accepted", "", 1.0f, AnimaCaller::conversationActor};
        SKSE::GetModCallbackEventSource()->SendEvent(&modEvent);
    }

    static void N2N_TravelToNpcLocation() {
        SKSE::ModCallbackEvent modEvent{"BLC_TravelToNPCLocation", "", 1.0f, nullptr};
        SKSE::GetModCallbackEventSource()->SendEvent(&modEvent);
    }

    static void N2N_Stop() {
        Util::WriteLog("Stopping dialogue between " + Util::GetActorName(AnimaCaller::N2N_SourceActor) + " and " +
                            Util::GetActorName(AnimaCaller::N2N_SourceActor) + ".", 3);
        SKSE::ModCallbackEvent modEvent{"BLC_Stop_N2N", "", 1.0f, nullptr};
        SKSE::GetModCallbackEventSource()->SendEvent(&modEvent);
        AnimaCaller::N2N_SourceActor = nullptr;
        AnimaCaller::N2N_TargetActor = nullptr;
    }

    static void ConnectionSuccessful() {
        if (AnimaCaller::connecting) {
            Util::WriteLog("Connected to " + Util::GetActorName(conversationActor) + ".", 3);
            AnimaCaller::conversationOngoing = true;
            AnimaCaller::stopSignal = false;
            AnimaCaller::connecting = false;
            SetHoldPosition(0, conversationActor);
        }
    }

    static void SendResponseLog(RE::Actor* actor, string message) {
        SKSE::ModCallbackEvent modEvent{"BLC_SendResponseLog", message, 1, actor};
        SKSE::GetModCallbackEventSource()->SendEvent(&modEvent);
    }

    static void Speak(std::string message, float duration) {
        if (AnimaCaller::conversationActor == nullptr) {
            Util::WriteLog("SPEAK REQUEST == ConversationActor is NULL == RETURNING.", 2);
            return;
        }
        SKSE::ModCallbackEvent modEvent{"BLC_Speak", "", 0.0075f, AnimaCaller::conversationActor};
        SKSE::GetModCallbackEventSource()->SendEvent(&modEvent);
        SubtitleManager::ShowSubtitle(AnimaCaller::conversationActor, message, duration);
    }

    static void EndInteraction() { SubtitleManager::HideSubtitle(); }

    static void SpeakN2N(std::string message, int speaker, float duration) {
        if (speaker == 0) {
            if (AnimaCaller::N2N_SourceActor == nullptr) return;
            SKSE::ModCallbackEvent modEvent{"BLC_Speak_N2N", "", 0, AnimaCaller::N2N_SourceActor};
            SKSE::GetModCallbackEventSource()->SendEvent(&modEvent);
            SubtitleManager::ShowSubtitle(AnimaCaller::N2N_SourceActor, message, duration);
        } else {
            if (AnimaCaller::N2N_TargetActor == nullptr) return;
            SKSE::ModCallbackEvent modEvent{"BLC_Speak_N2N", "", 1, AnimaCaller::N2N_TargetActor};
            SKSE::GetModCallbackEventSource()->SendEvent(&modEvent);
            SubtitleManager::ShowSubtitle(AnimaCaller::N2N_TargetActor, message, duration);
        }
    }

    static void SpeakBroadcast(std::string message, int speaker, int formId, float duration) {
        try {
            RE::Actor* actor = RE::TESForm::LookupByID<RE::Actor>(RE::FormID(formId));
            if (actor == nullptr) {
                Util::WriteLog("SpeakBroadcast: ACTOR NOT FOUND. RETURNING.");
                return;
            }

            Util::WriteLog("SpeakBroadcast: " + string(actor->GetName()) + "(" + to_string(speaker) + ")", 4);
            SKSE::ModCallbackEvent modEvent{"BLC_Speak_Broadcast", "", speaker, actor};
            SKSE::GetModCallbackEventSource()->SendEvent(&modEvent);
            SubtitleManager::ShowSubtitle(actor, message, duration);
        } catch (const exception& e) {
            Util::WriteLog("EXCEPTION during SpeakBroadcast: " + string(e.what()));
        } catch (...) {
            Util::WriteLog("UNKNOWN Exception during SpeakBroadcast.", 1);
            return;
        }
    }

    static void SendLookAt(int formId, int targetFormId) {
        RE::Actor* sourceActor = RE::TESForm::LookupByID<RE::Actor>(RE::FormID(formId));
        RE::Actor* targetActor = RE::TESForm::LookupByID<RE::Actor>(RE::FormID(targetFormId));

        Util::WriteLog("SendLookAt: " + string(sourceActor->GetName()) + " => " + targetActor->GetName(), 4);
        SKSE::ModCallbackEvent modEvent{"BLC_Send_LookAt", "", 0, sourceActor};
        SKSE::GetModCallbackEventSource()->SendEvent(&modEvent);
        this_thread::sleep_for(250ms);
        SKSE::ModCallbackEvent modEvent_2{"BLC_Send_LookAt", "", 1, targetActor};
        SKSE::GetModCallbackEventSource()->SendEvent(&modEvent_2);
    }

    static void StopLookAt(int formId) {
        RE::Actor* sourceActor = RE::TESForm::LookupByID<RE::Actor>(RE::FormID(formId));

        Util::WriteLog("StopLookAt: " + string(sourceActor->GetName()), 4);
        SKSE::ModCallbackEvent modEvent{"BLC_Send_LookAt", "", 0, sourceActor};
        SKSE::GetModCallbackEventSource()->SendEvent(&modEvent);
        this_thread::sleep_for(250ms);
        SKSE::ModCallbackEvent modEvent_2{"BLC_Send_LookAt", "", 2, nullptr};
        SKSE::GetModCallbackEventSource()->SendEvent(&modEvent_2);
    }

    static void HardReset() {
        Util::WriteLog("Sending HardReset Signal To Mod.", 4);
        SKSE::ModCallbackEvent modEvent{"BLC_HardReset", "", 0, nullptr};
        SKSE::GetModCallbackEventSource()->SendEvent(&modEvent);
        AnimaCaller::conversationOngoing = false;
        AnimaCaller::connecting = false;
        AnimaCaller::stopSignal = false;
        AnimaCaller::conversationActor = nullptr;
        AnimaCaller::N2N_SourceActor = nullptr;
        AnimaCaller::N2N_TargetActor = nullptr;
    }
};

#include "SocketManager.cpp"
#include <unordered_set>

static class EventWatcher {
    inline static unordered_set<string> lines;
    inline static unordered_set<string> topics;

    static bool contains(string line) {
        return lines.find(line) != lines.end();
    }
    static bool containsTopic(string topic) { topics.find(topic) != topics.end(); }

    static bool isDialogueMenuActive() { 
        RE::MenuTopicManager* topicManager = RE::MenuTopicManager::GetSingleton();
        return topicManager->speaker.get() != nullptr;
    }

public:
    inline static std::mutex m;

    class DialogueMenuEx : public RE::DialogueMenu {
    public:
        using ProcessMessage_t = decltype(&RE::DialogueMenu::ProcessMessage);
        inline static REL::Relocation<ProcessMessage_t> _ProcessMessage;

        void ProcessTopic(RE::MenuTopicManager* topicManager, RE::Actor* speaker) {
            Util::WriteLog("Processing dialogue menu with " + Util::GetActorName(speaker), 4);

            if (topicManager->lastSelectedDialogue != nullptr) {
                RE::BSSimpleList<RE::DialogueResponse*> responses = topicManager->lastSelectedDialogue->responses;

                std::string fullResponse = "";
                for (const auto& response : responses) {
                    fullResponse.append(response->text.c_str());
                }

                string characterEventText = "";
                string playerEventText = string(RE::PlayerCharacter::GetSingleton()->GetName()) + " said \"" +
                                   string(topicManager->lastSelectedDialogue->topicText.c_str()) + "\".";
                
                if (!contains(playerEventText)) {
                    string actorsStr = "";
                    for (RE::Actor* actor: actors) {
                        SocketManager::getInstance().SendLogEvent(actor, playerEventText);
                        actorsStr += Util::GetActorName(actor) + ", ";
                    }
                    if (actorsStr.length() > 0) actorsStr = actorsStr.substr(0, actorsStr.length() - 2);
                    Util::WriteLog("Sending player event text == " + playerEventText + " == to [" + actorsStr + "] ==", 4);

                    lines.insert(playerEventText);
                }

                if (!contains(fullResponse)) {
                    string actorsStr = "";
                    for (RE::Actor* actor : actors) {
                        if (Util::GetActorName(actor) == Util::GetActorName(speaker)) {
                            characterEventText = "You said \"" + string(fullResponse) + "\".";
                        } else {
                            characterEventText = Util::GetActorName(speaker) + " said \"" + string(fullResponse) + "\".";
                        }

                        SocketManager::getInstance().SendLogEvent(actor, characterEventText);
                        actorsStr += Util::GetActorName(actor) + ", ";
                    }
                    if (actorsStr.length() > 0) actorsStr = actorsStr.substr(0, actorsStr.length() - 2);
                    Util::WriteLog(
                        "Sending character event text == " + playerEventText + " == to [" + actorsStr + "]", 4);
                    lines.insert(fullResponse);
                }
            }
        }

        RE::UI_MESSAGE_RESULTS ProcessMessage_Hook(RE::UIMessage& a_message) {
            RE::MenuTopicManager* topicManager = RE::MenuTopicManager::GetSingleton();
            if (topicManager == nullptr || topicManager->speaker.get() == nullptr ||
                topicManager->speaker.get().get() == nullptr)
                return _ProcessMessage(this, a_message);
            RE::Actor* speaker = static_cast<RE::Actor*>(topicManager->speaker.get().get());
            if (speaker == nullptr) {
                Util::WriteLog("SPEAKER is not ACTOR. RETURNING.", 1);
                return _ProcessMessage(this, a_message);
            }

            m.lock();
            switch (a_message.type.get()) {
                case RE::UI_MESSAGE_TYPE::kUserEvent: {
                    ProcessTopic(topicManager, speaker);
                } break;
                case RE::UI_MESSAGE_TYPE::kShow: {
                    ProcessTopic(topicManager, speaker);
                } break;
                case RE::UI_MESSAGE_TYPE::kHide: {
                    ProcessTopic(topicManager, speaker);
                } break;
            }
            m.unlock();

            return _ProcessMessage(this, a_message);
        }
    };

    inline static set<RE::Actor*> actors;
    inline static map<string, string> voiceMap;

    static void SendSubtitle(RE::Actor* speaker, string subtitle) {
        if (subtitle.length() == 0) return;

        m.lock();
        string actorsStr = "";
        for (RE::Actor* actor : actors) {
            string eventText = "";
            if (Util::GetActorName(actor) == Util::GetActorName(speaker)) {
                eventText = "You said \"" + string(subtitle) + "\".";
            } else {
                eventText = Util::GetActorName(speaker) + " said \"" + subtitle + "\".";
            }
            SocketManager::getInstance().SendLogEvent(actor, eventText);
            actorsStr += Util::GetActorName(actor) + ", ";
        }
        if (actorsStr.length() > 0) actorsStr = actorsStr.substr(0, actorsStr.length() - 2);
        Util::WriteLog(
            "Sending subtitle  == " + Util::GetActorName(speaker) + " == " + subtitle + " == to [" + actorsStr + "] ==",
            4);
        m.unlock();
    }

    static void WatchSubtitles() {
        try {
            for (RE::SubtitleInfo subtitle : RE::SubtitleManager::GetSingleton()->subtitles) {
                RE::Actor* speaker = static_cast<RE::Actor*>(subtitle.speaker.get().get());

                if (speaker != nullptr && !contains(subtitle.subtitle.c_str()) &&
                    string(subtitle.subtitle.c_str()).find("==EMPTY_SUBTITLE==") == string::npos && !speaker->IsGhost()) {
                    lines.insert(subtitle.subtitle.c_str());
                    SendSubtitle(speaker, subtitle.subtitle.c_str());
                } else if (speaker == nullptr) {
                    Util::WriteLog("SPEAKER is not ACTOR.", 1);
                }
            }
        } catch (const exception& e) {
            Util::WriteLog("Exception during ==WatchSubtitles==: " + string(e.what()));
        } catch (...) {
            Util::WriteLog("Unknown exception during ==WatchSubtitles==.", 1);
        }
    }

    static void SendLogEvent(string log) {
        for (RE::Actor* actor : actors) {
            SocketManager::getInstance().SendLogEvent(actor, log);
        }
    }
};

#include "EventProcessor.cpp"

class ModPort {
public:
    static bool Start(RE::StaticFunctionTag*, RE::Actor* target, string voiceType, string currentDateTime) {
        if (target == nullptr) {
            return false;
        }

        SocketManager::getInstance().connectTo(target, voiceType, currentDateTime);

        return true;
    }

    static bool Stop(RE::StaticFunctionTag*) {
        if (AnimaCaller::conversationOngoing) {
            AnimaCaller::stopSignal = true;
            SocketManager::getInstance().SendStopSignal();
        }
        else {
            AnimaCaller::stopSignal = false;
            AnimaCaller::conversationOngoing = false;
            AnimaCaller::connecting = false;
            AnimaCaller::conversationActor = nullptr;
        }

        EventProcessor::GetSingleton()->conversationPair = nullptr;


        return true;
    }

    static bool N2N_Initiate(RE::StaticFunctionTag*, RE::Actor* source, RE::Actor* target, string sourceVoiceType, string targetVoiceType, string currentDateTime) {
        if (source == nullptr || target == nullptr) {
            return false;
        }

        SocketManager::getInstance().connectTo_N2N(source, target, sourceVoiceType, targetVoiceType, currentDateTime);

        return true;
    }

    static bool N2N_Start(RE::StaticFunctionTag*, string currentDateTime) {
        if (AnimaCaller::N2N_SourceActor == nullptr || AnimaCaller::N2N_TargetActor == nullptr) {
            return false;
        }

        SocketManager::getInstance().SendN2NStartSignal(AnimaCaller::N2N_SourceActor, AnimaCaller::N2N_TargetActor,
                                                        currentDateTime);

        return true;
    }

    static bool N2N_Stop(RE::StaticFunctionTag*) {
        SocketManager::getInstance().SendN2NStopSignal();

        return true;
    }

    static bool LogEvent(RE::StaticFunctionTag*, RE::Actor* actor, string log) {
        if (actor == nullptr) {
            return false;
        }

        SocketManager::getInstance().SendLogEvent(actor, log);

        return true;
    }

    static bool WatchSubtitles(RE::StaticFunctionTag*) {
        EventWatcher::WatchSubtitles();

        return true;
    }
    
    static bool ClearFollowers(RE::StaticFunctionTag*){
        try{
            AnimaCaller::followers.clear();
            SocketManager::getInstance().ClearFollowers();

            return true;
        } catch (const exception& e) {
            Util::WriteLog("EXCEPTION during SpeakBroadcast: " + string(e.what()));
            return false;
        } catch (...) {
            Util::WriteLog("UNKNOWN Exception during SpeakBroadcast.", 1);
            return false;
        }
    }

    static bool SendFollower(RE::StaticFunctionTag*, RE::Actor* actor, string voice, float distance) {
        try{
            Util::WriteLog("Sending follower: " + string(actor->GetName()));
            Follower* follower = new Follower(actor, voice, distance);
            AnimaCaller::followers.push_back(follower);
            SocketManager::getInstance().SendFollower(follower);
            return true;
        } catch (const exception& e) {
            Util::WriteLog("EXCEPTION during SpeakBroadcast: " + string(e.what()));
            return false;
        }
        catch (...) {
            Util::WriteLog("UNKNOWN Exception during SpeakBroadcast.", 1);
            return false;
        }
    }

    static bool ClearActors(RE::StaticFunctionTag*, bool empty) {
        EventWatcher::m.lock();
        EventWatcher::actors.clear();
        EventWatcher::voiceMap.clear();
        AnimaCaller::cellActors.clear();
        if (empty) {
            SocketManager::getInstance().SendCellActors(AnimaCaller::cellActors);
        }
        EventWatcher::m.unlock();

        return true;
    }

    static bool SendActor(RE::StaticFunctionTag*, RE::Actor* actor, string voice, float distance,
                          string currentDateTime) {
        try {
            EventWatcher::m.lock();
            EventWatcher::actors.insert(actor);
            EventWatcher::voiceMap.insert(pair(actor->GetName(), voice));
            AnimaCaller::cellActors.clear();
            for (RE::Actor* actor : EventWatcher::actors) {
                AnimaCaller::cellActors.insert(actor);
            }

            string currentLocation = RE::PlayerCharacter::GetSingleton()->GetCurrentLocation() != nullptr
                                         ? RE::PlayerCharacter::GetSingleton()->GetCurrentLocation()->GetName()
                                         : "";

            SocketManager::getInstance().SendCellActors(AnimaCaller::cellActors);
        } catch (const exception& e) {
            Util::WriteLog("Exception during SendActor: " + string(e.what()), 1);
            AnimaCaller::ShowReplyMessage("Exception occured. Check Anima logs.");
            AnimaCaller::Reset();
        } catch (...) {
            Util::WriteLog("Unkown exception during SendActor", 1);
            AnimaCaller::ShowReplyMessage("Exception occured. Check Anima logs.");
            AnimaCaller::Reset();
        }
        EventWatcher::m.unlock();

        return true;
    }

    static bool RemoveBroadcastActor(RE::StaticFunctionTag*, RE::Actor* actor) {
        AnimaCaller::broadcastActors.erase(actor);
        
        return true;
    }


    static bool SetBroadcastActor(RE::StaticFunctionTag*, RE::Actor* actor, string voice, float distance) {
        try {
            bool found = false;
            map<RE::Actor*, ActorData*>::iterator iter;
            for (iter = AnimaCaller::broadcastActors.begin(); iter != AnimaCaller::broadcastActors.end(); iter++) {
                if (actor->GetName() == iter->first->GetName()) {
                    found = true;
                    break;
                }
            }

            if (!found) {
                ActorData* actorData = new ActorData(voice, distance);
                AnimaCaller::broadcastActors.insert(std::pair(actor, actorData));
                string currentLocation = RE::PlayerCharacter::GetSingleton()->GetCurrentLocation() != nullptr
                                             ? RE::PlayerCharacter::GetSingleton()->GetCurrentLocation()->GetName()
                                             : "";
            }

        } catch (const exception& e) {
            Util::WriteLog("Exception during SetBroadcastActor: " + string(e.what()), 1);
            AnimaCaller::ShowReplyMessage("Exception occured. Check Anima logs.");
            AnimaCaller::Reset();
        } catch (...) {
            Util::WriteLog("Unkown exception during SetBroadcastActor", 1);
            AnimaCaller::ShowReplyMessage("Exception occured. Check Anima logs.");
            AnimaCaller::Reset();
        }

        return true;
    }

    static bool SendBroadcastActors(RE::StaticFunctionTag*, string currentDateTime) {
        try {
            bool first = true;
            string actors = "";
            map<RE::Actor*, ActorData*>::iterator iter;
            for (iter = AnimaCaller::broadcastActors.begin(); iter != AnimaCaller::broadcastActors.end(); iter++) {
                if (!first) {
                    actors += ", ";
                }
                actors += string(iter->first->GetName());
                first = false;
            }

            Util::WriteLog("SENDING BROADCAST ACTOR => " + actors);
            string currentLocation = RE::PlayerCharacter::GetSingleton()->GetCurrentLocation() != nullptr
                                         ? RE::PlayerCharacter::GetSingleton()->GetCurrentLocation()->GetName()
                                         : "";

            SocketManager::getInstance().SendBroadcastActors(AnimaCaller::broadcastActors, currentDateTime,
                                                             currentLocation);
        } catch (const exception& e) {
            Util::WriteLog("Exception during SendBroadcastActors: " + string(e.what()), 1);
            AnimaCaller::ShowReplyMessage("Exception occured. Check Anima logs.");
            AnimaCaller::Reset();
        } catch (...) {
            Util::WriteLog("Unkown exception during SendBroadcastActors", 1);
            AnimaCaller::ShowReplyMessage("Exception occured. Check Anima logs.");
            AnimaCaller::Reset();
        }

        return true;
    }

    static bool SendResponseLog(RE::StaticFunctionTag*, RE::Actor* actor, string message) {
        EventWatcher::SendSubtitle(actor, message);

        return true;
    }
};

void OnMessage(SKSE::MessagingInterface::Message* message) {
    if (message->type == SKSE::MessagingInterface::kInputLoaded) {
        SocketManager::getInstance().initSocket();
        RE::BSInputDeviceManager::GetSingleton()->AddEventSink(EventProcessor::GetSingleton());
    }
}

bool RegisterPapyrusFunctions(RE::BSScript::IVirtualMachine* vm) {
    vm->RegisterFunction("Start", "AnimaSKSE", &ModPort::Start);
    vm->RegisterFunction("Stop", "AnimaSKSE", &ModPort::Stop);
    vm->RegisterFunction("N2N_Initiate", "AnimaSKSE", &ModPort::N2N_Initiate);
    vm->RegisterFunction("N2N_Start", "AnimaSKSE", &ModPort::N2N_Start);
    vm->RegisterFunction("N2N_Stop", "AnimaSKSE", &ModPort::N2N_Stop);
    vm->RegisterFunction("LogEvent", "AnimaSKSE", &ModPort::LogEvent);
    vm->RegisterFunction("WatchSubtitles", "AnimaSKSE", &ModPort::WatchSubtitles);
    vm->RegisterFunction("ClearActors", "AnimaSKSE", &ModPort::ClearActors);
    vm->RegisterFunction("SendActor", "AnimaSKSE", &ModPort::SendActor);
    vm->RegisterFunction("SetBroadcastActor", "AnimaSKSE", &ModPort::SetBroadcastActor);
    vm->RegisterFunction("SendBroadcastActors", "AnimaSKSE", &ModPort::SendBroadcastActors);
    vm->RegisterFunction("RemoveBroadcastActor", "AnimaSKSE", &ModPort::RemoveBroadcastActor);
    vm->RegisterFunction("SendResponseLog", "AnimaSKSE", &ModPort::SendResponseLog);
    vm->RegisterFunction("ClearFollowers", "AnimaSKSE", &ModPort::ClearFollowers);
    vm->RegisterFunction("SendFollower", "AnimaSKSE", &ModPort::SendFollower);

    return true;
}

#include <ShellAPI.h>

void StartAudioBus() {
    auto mainPath = std::filesystem::current_path();
    auto clientPath = mainPath / "Anima" / "Audio" / "AudioBloc.exe";
    Util::WriteLog("Opening: " + clientPath.string(), 4);
    LPCWSTR exePath = clientPath.c_str();
    HINSTANCE result = ShellExecute(NULL, L"open", exePath, NULL, clientPath.parent_path().c_str(), SW_SHOWNORMAL);
}

void StartClient() {
    auto mainPath = std::filesystem::current_path();
    auto clientPath = mainPath / "Anima" / "Anima.exe";
    //Util::WriteLog("Opening: " + clientPath.string(), 4);
    LPCWSTR exePath = clientPath.c_str();
    HINSTANCE result = ShellExecute(NULL, L"open", exePath, NULL, clientPath.parent_path().c_str(), SW_SHOWNORMAL);
    //StartAudioBus();
}

int GetDebugLevel() {
    try {
        auto mainPath = std::filesystem::current_path();
        auto clientPath = mainPath / "Anima" / ".env";
        std::ifstream envFile(clientPath);  // Open the environment file for reading
        std::string line;
        int logLevel = -1;                       // Default value if CLIENT_PORT is not found
        while (std::getline(envFile, line)) {             // Read each line in the file
            if (line.contains("LOG_LEVEL")) {           // Check if the line contains the desired variable
                std::size_t pos = line.find("=");         // find position of equals sign
                std::string level = line.substr(pos + 1);  // extract substring after equals sign
                logLevel = std::stoi(level);             // Convert the value to an int
                break;                                    // Stop reading the file once the variable is found
            }
        }
        envFile.close();  // Close the file
        if (logLevel == -1) {
            throw new exception();
        }
        Util::WriteLog("LOG_LEVEL is set to " + std::to_string(logLevel), 3);
        return logLevel;
    } catch (...) {
        Util::WriteLog("LOG_LEVEL can't be read from .env file, assigning default value (3: INFO).", 2);
        return 3;
    }
}

#include "Hooks.h"

SKSEPluginLoad(const SKSE::LoadInterface* skse) {
    SKSE::Init(skse);
    
    Util::WriteLog("Plugin loaded. Initializing components.", 3);
    Util::LOG_LEVEL = GetDebugLevel();

    StartClient();

    auto* eventSink = EventProcessor::GetSingleton();

    // ScriptSource
    auto* eventSourceHolder = RE::ScriptEventSourceHolder::GetSingleton();
    //eventSourceHolder->AddEventSink<RE::TESActivateEvent>(eventSink);
    //eventSourceHolder->AddEventSink<RE::TESMagicEffectApplyEvent>(eventSink);
    eventSourceHolder->AddEventSink<RE::TESSpellCastEvent>(eventSink);

    // SKSE
    SKSE::GetCrosshairRefEventSource()->AddEventSink(eventSink);
    
    // Input Device
    SKSE::GetMessagingInterface()->RegisterListener(OnMessage);

    auto papyrus = SKSE::GetPapyrusInterface();
    if (papyrus) {
        papyrus->Register(RegisterPapyrusFunctions);
    }

    REL::Relocation<std::uintptr_t> vTable_dm(RE::VTABLE_DialogueMenu[0]);
    EventWatcher::DialogueMenuEx::_ProcessMessage =
        vTable_dm.write_vfunc(0x4, &EventWatcher::DialogueMenuEx::ProcessMessage_Hook);

    Anima::UpdatePCHook::Install();
    Anima::InvokeHook::Install();

    Util::GetSettings();

    return true;
}