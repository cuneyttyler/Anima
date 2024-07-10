#include <nlohmann/json.hpp>
#include <string>
#include <websocketpp/client.hpp>
#include <websocketpp/config/asio_no_tls_client.hpp>

using namespace std;

// pull out the type of messages sent by our config
typedef websocketpp::config::asio_client::message_type::ptr message_ptr;
using json = nlohmann::json;
typedef websocketpp::client<websocketpp::config::asio_client> client;

using websocketpp::lib::bind;
using websocketpp::lib::placeholders::_1;
using websocketpp::lib::placeholders::_2;

class Message {
public:
    Message(const string& type, const string& message, const string& id, const string& formId, const string& playerName = "",
            const string& location = "",
            const string& currentDateTime = "", const bool stop = false)
        : type(type),
          message(message),
          id(id),
          formId(formId),
          playerName(playerName),
          location(location),
          currentDateTime(currentDateTime), stop(stop) {}

    json toJson() const {
        return {{"type", type},
                {"message", message},
                {"id", id},
                {"formId", formId},
                {"playerName", playerName},
                {"is_n2n", false},
                {"location", location},
                {"currentDateTime", currentDateTime},
                {"stop", stop}
        };
    }

private:
    string type;
    string message;
    string id;
    string formId;
    string playerName;
    string location;
    string currentDateTime;
    bool stop;
};

class N2NMessage {
public:
    N2NMessage(const string& type, const string& message, const string& source, const string& target, const string& sourceFormId, const string& targetFormId, const string& playerName, int speaker,
               const string& location, const string& currentDateTime = "")
        : type(type),
          message(message),
          source(source),
          target(target),
          sourceFormId(sourceFormId),
          targetFormId(targetFormId),
          playerName(playerName),
          speaker(speaker),
          location(location),
          currentDateTime(currentDateTime) {}

    json toJson() const {
        return {{"type", type},     
                {"message", message}, 
                {"is_n2n", true},      
                {"source", source},   
                {"target", target}, 
                {"sourceFormId", sourceFormId},
                {"targetFormId", targetFormId}, 
                {"playerName", playerName},
                {"speaker", speaker},
                {"location", location},
                {"currentDateTime", currentDateTime}};
    }

private:
    string type;
    string message;
    string source;
    string target;
    string sourceFormId;
    string targetFormId;
    string playerName;
    int speaker;
    string location;
    string currentDateTime;
};

class AnimaSocketController {

public:
    client::connection_ptr con;
    client c;
    RE::Actor* conversationActor;

    AnimaSocketController() {
        // Set up the connection parameters
        std::string uri = "ws://127.0.0.1:" + std::to_string(getClientPort()) + "/chat";

        try {
            // set logging policy if needed
            c.clear_access_channels(websocketpp::log::alevel::frame_header);
            c.clear_access_channels(websocketpp::log::alevel::frame_payload);

            c.init_asio();

            c.set_message_handler(bind(&on_message, &c, ::_1, ::_2));

            websocketpp::lib::error_code ec;
            con = c.get_connection(uri, ec);
            c.connect(con);

            this->start_connection();
        } catch (const std::exception& e) {
            Util::WriteLog("Exception during socket connection: " + string(e.what()), 1);
            AnimaCaller::Reset();
        } catch (websocketpp::lib::error_code e) {
            Util::WriteLog("Exception during socket connection.", 1);
            AnimaCaller::Reset();
        } catch (...) {
            Util::WriteLog("Unknown exception during socket connection.", 1);
            AnimaCaller::Reset();
        }
    }

    static AnimaSocketController* GetSingleton() {
        static AnimaSocketController singleton;
        return &singleton;
    }

    int getClientPort() {
        try {
            auto mainPath = std::filesystem::current_path();
            auto clientPath = mainPath / "Anima" / ".env";
            std::ifstream envFile(clientPath);  // Open the environment file for reading
            std::string line;
            int clientPort = 3000;                            // Default value if CLIENT_PORT is not found
            while (std::getline(envFile, line)) {             // Read each line in the file
                if (line.contains("CLIENT_PORT")) {           // Check if the line contains the desired variable
                    std::size_t pos = line.find("=");         // find position of equals sign
                    std::string port = line.substr(pos + 1);  // extract substring after equals sign
                    clientPort = std::stoi(port);             // Convert the value to an int
                    break;                                    // Stop reading the file once the variable is found
                }
            }
            envFile.close();  // Close the file
            return clientPort;
        } catch (...) {
            Util::WriteLog("PORT can't be read from .env file, assigning default value (3030).", 2);
            return 3030;
        }
    }

    void start_connection() {
        std::thread ws_thread(&AnimaSocketController::run, this);
        ws_thread.detach();
    }

    void run() {
        // The WebSocket server connection will be started in a separate thread
        c.run();
    }

    void send_message(Message* message) {
        // Send a JSON message to the server
        try {
            json messageJson = message->toJson();
            std::string message_str = messageJson.dump();
            c.send(con->get_handle(), message_str, websocketpp::frame::opcode::text);
        } catch (const exception& e) {
            Util::WriteLog("Exception during send_message: " + string(e.what()), 1);
        } catch (...) {
            Util::WriteLog("Unkown exception during send_message", 1);
        }
    }

    void send_message_n2n(N2NMessage* message) {
        try {
            json messageJson = message->toJson();
            std::string message_str = messageJson.dump();
            c.send(con->get_handle(), message_str, websocketpp::frame::opcode::text);
        } catch (const exception& e) {
            Util::WriteLog("Exception during send_message_n2n: " + string(e.what()), 1);
        } catch (...) {
            Util::WriteLog("Unkown exception during send_message_n2n", 1);
        }
    }

    static void on_message(client* c, websocketpp::connection_hdl hdl, message_ptr msg) {
        try {
            json j = json::parse(msg->get_payload());

            std::string message = j["message"];
            std::string type = j["type"];
            bool is_n2n = j["is_n2n"];
            int speaker = j["speaker"];
            float duration = j["duration"];

            Util::WriteLog("ON_MESSAGE ==" + type + "==" + to_string(is_n2n) + "==" + to_string(speaker) +
                                  "==" + to_string(duration) + "==" + message + "==");

            if (type == "established" && !is_n2n) {
                AnimaCaller::ShowReplyMessage("NPC is listening...");
                AnimaCaller::ConnectionSuccessful();
            } else if (type == "established" && is_n2n) {
                AnimaCaller::n2n_established_response_count++;
                if (AnimaCaller::n2n_established_response_count == 3)
                    AnimaCaller::N2N_Init();
            } else if (type == "chat" && !is_n2n) {
                AnimaCaller::Speak(message, duration);
            } else if (type == "chat" && is_n2n) {
                AnimaCaller::SpeakN2N(message, speaker, duration);
            } else if (type == "end_interaction") {
            } else if (type == "end" && !is_n2n) {
                AnimaCaller::Stop();
            } else if (type == "follow_request_accepted" && !is_n2n) {
                AnimaCaller::SendFollowRequestAcceptedSignal();
            } else if (type == "end" && is_n2n) {
                AnimaCaller::N2N_Stop();
            } else if (type == "doesntexist" && !is_n2n) {
                Util::WriteLog("NPC doesn't exist in database == " +
                                Util::GetActorName(AnimaCaller::conversationActor) + " ==.", 4);
                AnimaCaller::ShowReplyMessage(message);
                AnimaCaller::conversationActor = nullptr;
                AnimaCaller::connecting = false;
            } else if (type == "doesntexist" && is_n2n) {
                Util::WriteLog(
                    "NPC doesn't exist in database == " + Util::GetActorName(AnimaCaller::N2N_SourceActor) + ", " +
                    Util::GetActorName(AnimaCaller::N2N_TargetActor) + " ==.", 4);
                AnimaCaller::ShowReplyMessage(message);
                AnimaCaller::N2N_SourceActor = nullptr;
                AnimaCaller::N2N_TargetActor = nullptr;
            }
        } 
        catch (const exception& e) {
            Util::WriteLog("Exception on on_message: " + string(e.what()), 1);
        } catch (...) {
            Util::WriteLog("Unkown exception during on_message", 1);
        }
    }
};

class SocketManager {
private:
    AnimaSocketController* soc;
    const char* lastConnected;
    SocketManager() {}

    SocketManager(const SocketManager&) = delete;
    SocketManager& operator=(const SocketManager&) = delete;

public:
    static SocketManager& getInstance() {
        static SocketManager instance;
        return instance;
    }

    void initSocket() { 
        soc = new AnimaSocketController();
    }

    void sendMessage(std::string message, RE::Actor* conversationActor, bool stop) {
        if (conversationActor == nullptr) return;

        auto id = conversationActor->GetName();
        auto form_id = conversationActor->GetFormID();
        
        auto playerName = RE::PlayerCharacter::GetSingleton()->GetName();

        if (lastConnected != id) {
            lastConnected = id;
            Message* messageObj = new Message("connect", "connect request..", id, to_string(form_id), playerName, "", "", stop);
            soc->send_message(messageObj);
        }

        Message* messageObj = new Message("message", message, id, to_string(form_id), playerName, "", "", stop);
        soc->send_message(messageObj);
    }

    void SendStopSignal() {
        Util::WriteLog("Sending STOP signal.", 4);
        ValidateSocket();
        auto playerName = RE::PlayerCharacter::GetSingleton()->GetName();
        Message* message = new Message("stop", "stop", "", playerName);
        soc->send_message(message);
    }

    void SendLogEvent(RE::Actor* actor, string log) { 
        try {
            ValidateSocket();
            auto playerName = RE::PlayerCharacter::GetSingleton()->GetName();
            Message* message =
                new Message("log_event", log, Util::GetActorName(actor), std::to_string(actor->GetFormID()), playerName);
            soc->send_message(message);
        } catch (const exception& e) {
            Util::WriteLog("Exception on SendLogEvent: " + string(e.what()), 1);
        } catch (...) {
            Util::WriteLog("Unkown exception during SendLogEvent", 1);
        }
    }

    void SendN2NStartSignal(RE::Actor* source, RE::Actor* target, string currentDateTime) {
        if (source == nullptr|| target == nullptr) return;
        Util::WriteLog(
            "Sending N2N Start Signal == " + Util::GetActorName(source) + ", " + Util::GetActorName(target) + " ==", 4);
        auto playerName = RE::PlayerCharacter::GetSingleton()->GetName();
        N2NMessage* message = new N2NMessage("start", "", source->GetName(), target->GetName(),
                                             to_string(source->GetFormID()), to_string(target->GetFormID()), playerName, 0,
                           source->GetCurrentLocation() != nullptr ? source->GetCurrentLocation()->GetName()
                           : "", currentDateTime);
        soc->send_message_n2n(message);
    }

    void SendN2NStopSignal() {
        Util::WriteLog("Sending N2N STOP Signal.", 4);
        auto playerName = RE::PlayerCharacter::GetSingleton()->GetName();
        N2NMessage* message = new N2NMessage("stop", "", "", "", "", "", playerName, 0, "");
        soc->send_message_n2n(message);
    }

    void ValidateSocket() { 
        if (soc == nullptr || soc->con == nullptr) {
            soc = new AnimaSocketController();
        }
    }

    void controlVoiceInput(bool talk, RE::Actor* conversationActor) {
        try {
            ValidateSocket();
            auto id = conversationActor->GetName();
            auto form_id = conversationActor->GetFormID();
            
            if (id == nullptr || id == "") return;
            if (lastConnected != id) return;
            AnimaCaller::conversationActor = conversationActor;
            Message* message;
            if (talk) 
                 message = new Message("start_listen", "start", lastConnected, "");
            else
                 message = new Message("stop_listen", "stop", lastConnected, "");
            soc->send_message(message);
        } catch (const exception& e) {
            Util::WriteLog("Exception on controlVoiceInput: " + string(e.what()), 1);
        } catch (...) {
            Util::WriteLog("Unkown exception during controlVoiceInput", 1);
        }
    }

    void connectTo(RE::Actor* conversationActor, string currentDateTime) {
        if (conversationActor == nullptr) return;
        ValidateSocket();
        auto id = conversationActor->GetName();
        auto form_id = conversationActor->GetFormID();
        auto location = conversationActor->GetCurrentLocation() != nullptr
                            ? conversationActor->GetCurrentLocation()->GetName()
                            : "";
        auto playerName = RE::PlayerCharacter::GetSingleton()->GetName();
        if (id == nullptr || id == "") return;
        Util::WriteLog("Connecting to " + Util::GetActorName(conversationActor) + ".", 4);
        AnimaCaller::conversationActor = conversationActor;
        lastConnected = id;
        Message* message =
            new Message("connect", "connect request..", id, to_string(form_id), playerName, location, currentDateTime);
        soc->send_message(message);
    }

    void connectTo_N2N(RE::Actor* sourceActor, RE::Actor* targetActor) {
        if (sourceActor == nullptr || targetActor == nullptr) return;
        ValidateSocket();
        auto source_id = sourceActor->GetName();
        auto target_id = targetActor->GetName();
        auto source_form_id = sourceActor->GetFormID();
        auto target_form_id = targetActor->GetFormID();
        if (source_id == nullptr || source_id == "" || target_id == nullptr || target_id == "") return;
        Util::WriteLog("Connecting(N2N) to " + string(source_id) + " and " + string(target_id) + ".", 4);
        AnimaCaller::N2N_SourceActor = sourceActor;
        AnimaCaller::N2N_TargetActor = targetActor;
        auto playerName = RE::PlayerCharacter::GetSingleton()->GetName();
        N2NMessage* message = new N2NMessage("connect", "connect", source_id, target_id, to_string(source_form_id), to_string(target_form_id), playerName, 0,"");
        soc->send_message_n2n(message);
    }
};