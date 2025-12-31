import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
export default function MeetingPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { suggestion, aiQuestions } = state || {};
  const [meetingStarted, setMeetingStarted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState([]);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [productivityData, setProductivityData] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const recognitionRef = useRef(null);
  const videoRef = useRef(null);
  const messagesEndRef = useRef(null);
  const localStreamRef = useRef(null);
  const isRecognitionActive = useRef(false);
  const utteranceRef = useRef(null);
  const AI_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
  useEffect(() => {
    const initializeSpeechRecognition = () => {
      if ('webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.maxAlternatives = 1;
        setSpeechSupported(true);
        recognitionRef.current.onstart = () => {
          console.log("Speech recognition started");
          isRecognitionActive.current = true;
        };
        recognitionRef.current.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          setTranscript(interimTranscript);
          if (finalTranscript.trim()) {
            console.log("Final transcript:", finalTranscript);
            setTranscript("");
            handleUserMessage(finalTranscript.trim());
          }
        };
        recognitionRef.current.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          isRecognitionActive.current = false;
          if (event.error === 'not-allowed') {
            alert("Microphone access denied. Please allow microphone access and try again.");
            setIsListening(false);
          } else if (event.error === 'no-speech') {
            console.log("No speech detected, continuing...");
            if (isListening) {
              setTimeout(() => {
                startRecognition();
              }, 1000);
            }
          } else if (event.error === 'network') {
            console.log("Network error, retrying...");
            if (isListening) {
              setTimeout(() => {
                startRecognition();
              }, 2000);
            }
          } else {
            setIsListening(false);
          }
        };
        recognitionRef.current.onend = () => {
          console.log("Speech recognition ended");
          isRecognitionActive.current = false;
          if (isListening && isMicrophoneEnabled) {
            setTimeout(() => {
              startRecognition();
            }, 100);
          }
        };
      } else if ('SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        setSpeechSupported(true);
      } else {
        console.warn("Speech recognition not supported in this browser");
        setSpeechSupported(false);
      }
    };
    initializeSpeechRecognition();
    return () => {
      if (recognitionRef.current && isRecognitionActive.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error("Error stopping speech recognition:", e);
        }
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  const fetchProductivityData = async () => {
    setIsLoadingData(true);
    setDataError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Authentication token not found");
      }
      const response = await axios.get(`${API_BASE_URL}/ch`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log("Productivity data fetched:", response.data);
      setProductivityData(response.data);
    } catch (error) {
      console.error("Error fetching productivity data:", error);
      setDataError("Failed to fetch productivity data. Please check your connection.");
    } finally {
      setIsLoadingData(false);
    }
  };
  const startRecognition = () => {
    if (!recognitionRef.current || !speechSupported || !isMicrophoneEnabled) {
      console.log("Cannot start recognition: missing requirements");
      return false;
    }
    if (isRecognitionActive.current) {
      console.log("Recognition already active");
      return true;
    }
    try {
      recognitionRef.current.start();
      return true;
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      if (error.name === 'InvalidStateError') {
        return true;
      }
      return false;
    }
  };
  const stopRecognition = () => {
    if (recognitionRef.current && isRecognitionActive.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Error stopping speech recognition:", error);
      }
    }
    isRecognitionActive.current = false;
  };
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);
  const startMeeting = async () => {
    try {
      await fetchProductivityData();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      localStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setMeetingStarted(true);
      let welcomeMessage = 'Hello! I\'m your FocusAI assistant. I can help you understand your productivity data and provide insights on improving your focus.';
      if (productivityData && productivityData.length > 0) {
        const latestData = productivityData[productivityData.length - 1];
        welcomeMessage += ` I see that your current focus score is ${Math.round(latestData.focusScore)}%. How can I help you today?`;
      }
      setMessages([{
        sender: 'ai',
        text: welcomeMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      speakText(welcomeMessage);
      setTimeout(() => {
        if (speechSupported) {
          toggleListening();
        }
      }, 3000);
    } catch (error) {
      console.error("Error accessing media devices or fetching data:", error);
      alert("Unable to start meeting. Please check your camera and microphone permissions.");
    }
  };
  const toggleListening = () => {
    if (!speechSupported) {
      alert("Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.");
      return;
    }
    if (!isMicrophoneEnabled) {
      alert("Please enable your microphone first.");
      return;
    }
    if (isListening) {
      console.log("Stopping speech recognition");
      stopRecognition();
      setIsListening(false);
      setTranscript("");
    } else {
      console.log("Starting speech recognition");
      setIsListening(true);
      const started = startRecognition();
      if (!started) {
        setIsListening(false);
        alert("Could not start speech recognition. Please check your microphone permissions.");
      }
    }
  };
  const analyzeProductivityData = () => {
    if (!productivityData || productivityData.length === 0) {
      return null;
    }
    const latestData = productivityData[productivityData.length - 1];
    console.log("Latest productivity data:", latestData);
    const focusScore = Math.round(latestData.focusScore || 0);
    const productiveTime = (latestData.totalProductiveTime || 0) / 3600;
    const distractionTime = (latestData.totalNonProductiveTime || 0) / 3600;
    const mostUsedApp = latestData.mostUsedApp || latestData.maxUsedApp || "Unknown";
    const mostVisitedTab = latestData.mostVisitedTab || latestData.maxVisitedTab || "Unknown";
    const weekAgoData = productivityData.length > 7 ? productivityData[productivityData.length - 8] : null;
    let focusTrend = null;
    if (weekAgoData && weekAgoData.focusScore !== undefined) {
      const scoreDifference = focusScore - Math.round(weekAgoData.focusScore || 0);
      focusTrend = {
        direction: scoreDifference > 0 ? "improving" : scoreDifference < 0 ? "declining" : "stable",
        percentage: Math.abs(scoreDifference)
      };
    }
    return {
      focusScore,
      productiveTime: productiveTime.toFixed(1),
      distractionTime: distractionTime.toFixed(1),
      topProductiveApp: mostUsedApp,
      mostDistractionApp: latestData.distractionApps ?
        getTopDistractionApp(latestData.distractionApps) : "Social media",
      focusTrend,
      totalApps: getTotalApps(latestData),
      mostVisitedTab,
      mostUsedApp
    };
  };
  const getTopDistractionApp = (distractionApps) => {
    if (!distractionApps) return "Unknown";
    try {
      if (distractionApps.entries && typeof distractionApps.entries === 'function') {
        const distractionEntries = Array.from(distractionApps.entries());
        if (distractionEntries.length > 0) {
          return distractionEntries.sort((a, b) => b[1] - a[1])[0][0];
        }
      }
      else if (Array.isArray(distractionApps)) {
        if (distractionApps.length > 0) {
          return distractionApps.sort((a, b) => b.duration - a.duration)[0].name;
        }
      }
      else if (typeof distractionApps === 'object') {
        const entries = Object.entries(distractionApps);
        if (entries.length > 0) {
          return entries.sort((a, b) => b[1] - a[1])[0][0];
        }
      }
    } catch (error) {
      console.error("Error parsing distraction apps:", error);
    }
    return "Social media";
  };
  const getTotalApps = (data) => {
    let count = 0;
    if (data.productiveContent && typeof data.productiveContent.size === 'number') {
      count += data.productiveContent.size;
    } else if (data.productiveApps && Array.isArray(data.productiveApps)) {
      count += data.productiveApps.length;
    }
    if (data.nonProductiveContent && typeof data.nonProductiveContent.size === 'number') {
      count += data.nonProductiveContent.size;
    } else if (data.distractionApps && Array.isArray(data.distractionApps)) {
      count += data.distractionApps.length;
    }
    return count || 'Unknown';
  };
  const handleUserMessage = async (text) => {
    if (!text || text.trim() === '') return;
    console.log("Processing user message:", text);
    const userMessage = {
      sender: 'user',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMessage]);
    setTranscript("");
    setIsAiResponding(true);
    try {
      const productivityAnalysis = analyzeProductivityData();
      const aiResponse = await getAiResponse(text, productivityAnalysis);
      const aiMessage = {
        sender: 'ai',
        text: aiResponse,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMessage]);
      if (!isMuted) {
        speakText(aiResponse);
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
      const errorMessage = {
        sender: 'ai',
        text: "I'm sorry, I had trouble processing your request. Could you try again?",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
      if (!isMuted) {
        speakText("I'm sorry, I had trouble processing your request. Could you try again?");
      }
    } finally {
      setIsAiResponding(false);
    }
  };
  const getAiResponse = async (userInput, productivityAnalysis) => {
    console.log("Getting AI response for:", userInput);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Authentication token not found");
      }
      console.log("Fetching fresh productivity data from /ch endpoint");
      const dataResponse = await axios.get(`${API_BASE_URL}/ch`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!dataResponse.data || !Array.isArray(dataResponse.data) || dataResponse.data.length === 0) {
        throw new Error("Invalid or empty productivity data received from server");
      }
      console.log("Fresh productivity data fetched:", dataResponse.data);
      setProductivityData(dataResponse.data);
      console.log("Sending raw productivity data to Groq");
      const groqResponse = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are FocusAI, a productivity assistant that helps users understand their productivity data and
              improve their focus and work habits. You have access to the user's complete productivity data.
              Your tone should be helpful, encouraging, and data-driven. Focus on actionable insights.
              Give specific advice based on the exact data you see. Do not use generic responses.
              If the data shows unexpected patterns, point them out. Be specific about applications,
              focus scores, and time spent on different activities.
              Respond directly to the user's question using their productivity data.
              Be conversational but precise with numbers and insights.`
            },
            {
              role: "user",
              content: `Here is my complete productivity data: ${JSON.stringify(dataResponse.data)}\n\nMy question is: ${userInput}`
            }
          ],
          temperature: 0.6,
          max_tokens: 1024
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${AI_API_KEY}`
          }
        }
      );
      if (!groqResponse.data ||
        !groqResponse.data.choices ||
        !groqResponse.data.choices.length ||
        !groqResponse.data.choices[0].message) {
        throw new Error("Invalid response format from Groq API");
      }
      const aiResponseContent = groqResponse.data.choices[0].message.content;
      return aiResponseContent;
    } catch (error) {
      console.error("Error in AI response generation:", error);
      return "I'm having trouble accessing your productivity data right now. Could you try asking your question again in a moment?";
    }
  };
  const generateLocalResponse = (userInput, productivityData) => {
    const input = userInput.toLowerCase();
    if (input.match(/\b(focus score|productivity|productive|focus|stats|statistics)\b/)) {
      if (!productivityData) {
        return "I don't have your productivity data available right now. Please check your connection or try again later.";
      }
      return `Your current focus score is ${productivityData.focusScore}%. ${productivityData.focusTrend
        ? `This is ${productivityData.focusTrend.percentage}% ${productivityData.focusTrend.direction} compared to last week. `
        : ''
        }You've spent ${productivityData.productiveTime} hours on productive activities and ${productivityData.distractionTime} hours on distractions today. Your most productive application is ${productivityData.topProductiveApp}.`;
    }
    if (input.match(/\b(distract|distracting|distractions|wasting time|time wasters)\b/)) {
      if (!productivityData) {
        return "I don't have your distraction data available right now. Please check your connection or try again later.";
      }
      return `Your main source of distraction is ${productivityData.mostDistractionApp}. You've spent ${productivityData.distractionTime} hours on non-productive activities today. ${parseFloat(productivityData.distractionTime) > 2
        ? "That's quite significant. Consider using focus mode or website blockers to minimize these distractions."
        : "You're doing well at managing distractions."
        }`;
    }
    if (input.match(/\b(improve|better|increase|enhance|tips|advice|suggestion|help me)\b/)) {
      if (!productivityData) {
        return "Here are some general productivity tips: break your work into 25-minute focused sessions, minimize distractions by turning off notifications, prioritize your most important tasks first, and take regular short breaks.";
      }
      if (productivityData.focusScore < 50) {
        return `With a focus score of ${productivityData.focusScore}%, you have room for improvement. Try limiting time on ${productivityData.mostDistractionApp}, use the Pomodoro technique (25 minutes of focused work followed by 5-minute breaks), and consider blocking distracting websites during work hours.`;
      } else if (productivityData.focusScore < 75) {
        return `Your focus score of ${productivityData.focusScore}% is good, but you can do better. Try to increase your time on ${productivityData.topProductiveApp} and decrease time on ${productivityData.mostDistractionApp}. Setting specific goals for each work session might also help you stay focused.`;
      } else {
        return `Great job maintaining a high focus score of ${productivityData.focusScore}%! To maintain this level, keep using ${productivityData.topProductiveApp} and continue your current workflow. Remember that regular breaks are still important for sustained productivity.`;
      }
    }
    if (input.match(/\b(app|application|program|software|using|use most|used most)\b/)) {
      if (!productivityData) {
        return "I don't have your application usage data available right now. Please check your connection or try again later.";
      }
      return `Your most used application is ${productivityData.mostUsedApp}, and your most productive application is ${productivityData.topProductiveApp}. Your most visited website is ${productivityData.mostVisitedTab || "not recorded"}.`;
    }
    if (productivityData) {
      return `I'm your FocusAI assistant. Your current focus score is ${productivityData.focusScore}%. You can ask me about your productivity stats, distractions, most used apps, or for tips to improve your focus. How can I help you today?`;
    } else {
      return "I'm your FocusAI assistant. I can help analyze your productivity data and provide tips to improve your focus. However, I don't have access to your data right now. Would you like to know some general productivity tips?";
    }
  };
  const speakText = (text) => {
    if (!text || text.trim() === '') return;
    if ('speechSynthesis' in window) {
      console.log("Preparing to speak:", text.substring(0, 50) + "...");
      window.speechSynthesis.cancel();
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        let voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
          console.log("Voices not loaded yet, waiting...");
          voices = window.speechSynthesis.getVoices();
        }
        let preferredVoice = voices.find(voice =>
          voice.name.includes('Google') && voice.name.includes('Female') && voice.lang.includes('en-US')
        );
        if (!preferredVoice) {
          preferredVoice = voices.find(voice =>
            voice.name.includes('Google') && voice.name.includes('en-US')
          );
        }
        if (!preferredVoice) {
          preferredVoice = voices.find(voice => voice.lang.includes('en-US'));
        }
        if (!preferredVoice && voices.length > 0) {
          preferredVoice = voices[0];
        }
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
        console.log("Speaking with voice:", utterance.voice?.name || "Default");
        utterance.onstart = () => {
          console.log("Speech synthesis started firing onstart event");
          setIsPlaying(true);
        };
        utterance.onend = () => {
          console.log("Speech synthesis ended firing onend event");
          setIsPlaying(false);
          utteranceRef.current = null;
          if (isListening && isMicrophoneEnabled) {
            setTimeout(() => {
              startRecognition();
            }, 500);
          }
        };
        utterance.onerror = (event) => {
          console.error("Speech synthesis error event:", event);
          setIsPlaying(false);
          utteranceRef.current = null;
          if (event.error === 'network' || event.error === 'not-allowed') {
            console.warn("Retrying speech without preferred voice...");
            const retryUtterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(retryUtterance);
          }
        };
        window.speechSynthesis.speak(utterance);
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }, 150);
    } else {
      console.warn("Speech synthesis not supported in this browser");
    }
  };
  const toggleMicrophone = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !isMicrophoneEnabled;
        setIsMicrophoneEnabled(!isMicrophoneEnabled);
        if (isMicrophoneEnabled && isListening) {
          toggleListening();
        }
      }
    }
  };
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = !isCameraEnabled;
        setIsCameraEnabled(!isCameraEnabled);
      }
    }
  };
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      window.speechSynthesis.cancel();
    }
  };
  const endMeeting = () => {
    stopRecognition();
    setIsListening(false);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    window.speechSynthesis.cancel();
    setMeetingStarted(false);
    navigate('/');
  };
  const formatProductivityData = () => {
    if (!productivityData || productivityData.length === 0) {
      return null;
    }
    const latestData = productivityData[productivityData.length - 1];
    return {
      focusScore: Math.round(latestData.focusScore),
      productiveTime: (latestData.totalProductiveTime / 3600).toFixed(1),
      distractionTime: (latestData.totalNonProductiveTime / 3600).toFixed(1),
      mostUsedApp: latestData.mostUsedApp || "N/A",
      mostVisitedTab: latestData.mostVisitedTab || "N/A",
      date: new Date(latestData.date).toLocaleDateString()
    };
  };
  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#202124",
      color: "white",
      overflow: "hidden"
    }}>
      { }
      <header style={{
        padding: "12px 16px",
        backgroundColor: "#202124",
        borderBottom: "1px solid #3c4043",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{
            width: "32px",
            height: "32px",
            backgroundColor: "#4a6cff",
            borderRadius: "8px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginRight: "10px",
            fontSize: "18px",
            fontWeight: "bold"
          }}>F</div>
          <h2 style={{ margin: 0, fontSize: "18px" }}>FocusAI Productivity Meeting</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {!speechSupported && (
            <span style={{ fontSize: "12px", color: "#f28b82" }}>
              Speech recognition not supported
            </span>
          )}
          <span style={{ fontSize: "14px", color: "#8ab4f8" }}>
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </header>
      {!meetingStarted ? (
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "20px"
        }}>
          <div style={{
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            backgroundColor: "#3c4043",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: "30px",
            fontSize: "48px",
            color: "#e8eaed"
          }}>
            👤
          </div>
          <h2 style={{ fontSize: "24px", marginBottom: "8px" }}>Ready to discuss your productivity?</h2>
          <p style={{ fontSize: "16px", color: "#9aa0a6", marginBottom: "30px", textAlign: "center" }}>
            Your FocusAI assistant is ready to help you understand your productivity data
            and provide personalized insights.
          </p>
          {isLoadingData && (
            <div style={{ marginBottom: "20px", textAlign: "center" }}>
              <p style={{ color: "#8ab4f8" }}>Loading your productivity data...</p>
            </div>
          )}
          {dataError && (
            <div style={{
              backgroundColor: "#5c3836",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "20px",
              textAlign: "center"
            }}>
              <p style={{ margin: 0, fontSize: "14px", color: "#f28b82" }}>
                {dataError}
              </p>
            </div>
          )}
          {!speechSupported && (
            <div style={{
              backgroundColor: "#5c3836",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "20px",
              textAlign: "center"
            }}>
              <p style={{ margin: 0, fontSize: "14px", color: "#f28b82" }}>
                Speech recognition is not supported in your browser.
                <br />Please use Chrome, Edge, or Safari for voice features.
              </p>
            </div>
          )}
          <button
            onClick={startMeeting}
            disabled={isLoadingData}
            style={{
              padding: "12px 24px",
              backgroundColor: "#4a6cff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "16px",
              fontWeight: "500",
              cursor: isLoadingData ? "not-allowed" : "pointer",
              opacity: isLoadingData ? 0.7 : 1
            }}
          >
            Start Productivity Meeting
          </button>
        </div>
      ) : (
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}>
          { }
          <div style={{
            flex: 1,
            display: "flex",
            padding: "16px",
            overflow: "hidden"
          }}>
            { }
            <div style={{
              flex: "1 1 70%",
              borderRadius: "8px",
              overflow: "hidden",
              backgroundColor: "#121212",
              position: "relative",
              marginRight: "16px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center"
            }}>
              { }
              <div style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                position: "relative"
              }}>
                { }
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "radial-gradient(circle at center, #1a237e 0%, #0d1117 70%)",
                  opacity: 0.3
                }}></div>
                { }
                <div style={{
                  width: "280px",
                  height: "280px",
                  position: "relative",
                  marginBottom: "20px",
                  zIndex: 1,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: "50%",
                  background: isAiResponding || isPlaying ?
                    "linear-gradient(135deg, #4a6cff, #1a237e)" :
                    "linear-gradient(135deg, #3949ab, #1a237e)",
                  boxShadow: isAiResponding || isPlaying ?
                    "0 0 40px rgba(74, 108, 255, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.2)" :
                    "0 0 20px rgba(74, 108, 255, 0.3), inset 0 0 10px rgba(255, 255, 255, 0.1)",
                  animation: isAiResponding || isPlaying ? "pulse-glow 2s infinite alternate" : "none"
                }}>
                  <div style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    overflow: "hidden"
                  }}>
                    { }
                    <span style={{
                      fontSize: "72px",
                      fontWeight: "900",
                      color: "white",
                      textShadow: "0 2px 10px rgba(0, 0, 0, 0.3)",
                      letterSpacing: "-1px",
                      zIndex: 2
                    }}>AI</span>
                    { }
                    <span style={{
                      fontSize: "20px",
                      fontWeight: "500",
                      color: "rgba(255, 255, 255, 0.8)",
                      marginTop: "5px",
                      textTransform: "uppercase",
                      letterSpacing: "3px",
                      zIndex: 2
                    }}>FOCUS</span>
                    { }
                    {(isAiResponding || isPlaying) && (
                      <>
                        {[...Array(3)].map((_, i) => (
                          <div key={i} style={{
                            position: "absolute",
                            width: "100%",
                            height: "100%",
                            borderRadius: "50%",
                            border: "2px solid rgba(255, 255, 255, 0.3)",
                            animation: `ripple ${2 + i * 0.5}s infinite ease-out ${i * 0.5}s`
                          }}></div>
                        ))}
                        { }
                        <div style={{
                          position: "absolute",
                          bottom: "50px",
                          left: "50%",
                          transform: "translateX(-50%)",
                          width: "160px",
                          height: "30px",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "flex-end",
                          gap: "6px"
                        }}>
                          {[...Array(7)].map((_, i) => (
                            <div key={i} style={{
                              width: "6px",
                              height: `${10 + Math.sin(i * 1.5) * 15}px`,
                              backgroundColor: "rgba(255, 255, 255, 0.7)",
                              borderRadius: "3px",
                              animation: `soundWave ${0.5 + Math.random() * 0.3}s infinite ease-in-out alternate ${i * 0.1}s`
                            }}></div>
                          ))}
                        </div>
                      </>
                    )}
                    { }
                    <div style={{
                      position: "absolute",
                      width: "200px",
                      height: "200px",
                      borderRadius: "50%",
                      background: "radial-gradient(circle at center, rgba(255, 255, 255, 0.15) 0%, transparent 70%)",
                      zIndex: 1
                    }}></div>
                  </div>
                </div>
                { }
                <div style={{
                  zIndex: 1,
                  textAlign: "center"
                }}>
                  <h2 style={{
                    fontSize: "28px",
                    marginBottom: "10px",
                    color: "#fff",
                    textShadow: "0 0 10px rgba(74, 108, 255, 0.8)"
                  }}>
                    FocusAI Assistant
                  </h2>
                  <div style={{
                    backgroundColor: isAiResponding ? "rgba(74, 108, 255, 0.3)" : "rgba(255, 255, 255, 0.1)",
                    padding: "10px 20px",
                    borderRadius: "30px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "10px",
                    backdropFilter: "blur(5px)",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)"
                  }}>
                    {isAiResponding ? (
                      <>
                        <div style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: "#4a6cff",
                          animation: "pulse 1s infinite"
                        }}></div>
                        <span>Processing your request...</span>
                      </>
                    ) : isPlaying ? (
                      <>
                        <div style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: "#4caf50",
                          animation: "pulse 1s infinite"
                        }}></div>
                        <span>Speaking...</span>
                      </>
                    ) : isListening ? (
                      <>
                        <div style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: "#ff9800",
                          animation: "pulse 1s infinite"
                        }}></div>
                        <span>Listening...</span>
                      </>
                    ) : (
                      <>
                        <div style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: "#4caf50"
                        }}></div>
                        <span>Ready to assist</span>
                      </>
                    )}
                  </div>
                </div>
                { }
                {transcript && (
                  <div style={{
                    position: "absolute",
                    bottom: "30px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    padding: "16px 24px",
                    borderRadius: "16px",
                    maxWidth: "80%",
                    textAlign: "center",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
                    backdropFilter: "blur(10px)",
                    zIndex: 10
                  }}>
                    <p style={{
                      margin: 0,
                      fontSize: "18px",
                      color: "#fff",
                      fontStyle: "italic"
                    }}>
                      "{transcript}"
                    </p>
                  </div>
                )}
                { }
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  overflow: "hidden",
                  zIndex: 0
                }}>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} style={{
                      position: "absolute",
                      width: `${50 + i * 20}px`,
                      height: `${50 + i * 20}px`,
                      borderRadius: "50%",
                      border: "1px solid rgba(74, 108, 255, 0.3)",
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`,
                      animation: `float ${5 + i * 2}s infinite ease-in-out ${i}s`
                    }}></div>
                  ))}
                </div>
              </div>
            </div>
            { }
            <div style={{
              flex: "1 1 30%",
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#202124",
              borderRadius: "8px",
              border: "1px solid #3c4043",
              overflow: "hidden",
              padding: "16px"
            }}>
              <h3 style={{
                fontSize: "18px",
                marginBottom: "16px",
                textAlign: "center",
                color: "#8ab4f8"
              }}>
                Conversation History
              </h3>
              <div style={{
                flex: 1,
                overflowY: "auto",
                marginBottom: "16px",
                paddingRight: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}>
                {messages.length === 0 ? (
                  <div style={{
                    height: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    color: "#5f6368",
                    fontStyle: "italic",
                    fontSize: "14px"
                  }}>
                    No messages yet
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      style={{
                        alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '90%',
                        backgroundColor: msg.sender === 'user' ? '#3c4043' : '#1a237e',
                        padding: '10px 12px',
                        borderRadius: msg.sender === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                        fontSize: '14px',
                        lineHeight: '1.4',
                        position: 'relative'
                      }}
                    >
                      <div style={{ marginBottom: '4px', fontWeight: 'bold', fontSize: '11px', color: '#9aa0a6' }}>
                        {msg.sender === 'user' ? 'You' : 'FocusAI'} • {msg.time}
                      </div>
                      <div>{msg.text}</div>
                      {msg.sender === 'ai' && (
                        <button
                          onClick={() => speakText(msg.text)}
                          style={{
                            marginTop: '8px',
                            background: 'none',
                            border: 'none',
                            color: '#8ab4f8',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 0'
                          }}
                        >
                          🔊 Replay Voice
                        </button>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <div style={{
                backgroundColor: isAiResponding ? "#4a6cff33" : "#3c4043",
                padding: "8px 12px",
                borderRadius: "16px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px"
              }}>
                {isAiResponding ? (
                  <>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#4a6cff", animation: "pulse 1s infinite" }}></div>
                    <span>AI is thinking...</span>
                  </>
                ) : isListening ? (
                  <>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#ff9800", animation: "pulse 1s infinite" }}></div>
                    <span>I'm listening...</span>
                  </>
                ) : (
                  <>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#4caf50" }}></div>
                    <span>Ready</span>
                  </>
                )}
              </div>
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}>
                <h4 style={{
                  fontSize: "12px",
                  color: "#9aa0a6",
                  margin: "0 0 4px 0",
                  textAlign: "center"
                }}>
                  Suggestions
                </h4>
                <button
                  onClick={() => handleUserMessage("What's my focus score?")}
                  disabled={isAiResponding}
                  style={{
                    padding: "8px 12px",
                    backgroundColor: "#3c4043",
                    border: "none",
                    borderRadius: "6px",
                    color: "#e8eaed",
                    fontSize: "13px",
                    cursor: isAiResponding ? "not-allowed" : "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  📊 Focus score?
                </button>
                <button
                  onClick={() => handleUserMessage("How can I improve?")}
                  disabled={isAiResponding}
                  style={{
                    padding: "8px 12px",
                    backgroundColor: "#3c4043",
                    border: "none",
                    borderRadius: "6px",
                    color: "#e8eaed",
                    fontSize: "13px",
                    cursor: isAiResponding ? "not-allowed" : "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  💡 Any tips?
                </button>
              </div>
            </div>
          </div>
          { }
          <div style={{
            padding: "16px",
            backgroundColor: "#202124",
            borderTop: "1px solid #3c4043",
            display: "flex",
            justifyContent: "center",
            gap: "16px"
          }}>
            <button
              onClick={toggleMicrophone}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: isMicrophoneEnabled ? "#3c4043" : "#ea4335",
                border: "none",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                cursor: "pointer",
                color: "white",
                fontSize: "20px"
              }}
              title={isMicrophoneEnabled ? "Mute Microphone" : "Unmute Microphone"}
            >
              {isMicrophoneEnabled ? "🎙️" : "🚫"}
            </button>
            <button
              onClick={toggleCamera}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: isCameraEnabled ? "#3c4043" : "#ea4335",
                border: "none",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                cursor: "pointer",
                color: "white",
                fontSize: "20px"
              }}
              title={isCameraEnabled ? "Turn Off Camera" : "Turn On Camera"}
            >
              {isCameraEnabled ? "📹" : "🚫"}
            </button>
            <button
              onClick={toggleListening}
              disabled={!speechSupported}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: !speechSupported ? "#5f6368" : (isListening ? "#ea4335" : "#3c4043"),
                border: "none",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                cursor: speechSupported ? "pointer" : "not-allowed",
                color: "white",
                fontSize: "20px",
                opacity: speechSupported ? 1 : 0.5
              }}
              title={!speechSupported ? "Speech recognition not supported" : (isListening ? "Stop Listening" : "Start Listening")}
            >
              {isListening ? "👂" : "🔊"}
            </button>
            <button
              onClick={toggleMute}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: isMuted ? "#ea4335" : "#3c4043",
                border: "none",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                cursor: "pointer",
                color: "white",
                fontSize: "20px"
              }}
              title={isMuted ? "Unmute AI" : "Mute AI"}
            >
              {isMuted ? "🔇" : "🔊"}
            </button>
            <button
              onClick={endMeeting}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#ea4335",
                border: "none",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                cursor: "pointer",
                color: "white",
                fontSize: "20px"
              }}
              title="End Meeting"
            >
              📞
            </button>
          </div>
        </div>
      )}
      { }
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1.0); }
          }
          @keyframes soundWave {
            0% { height: 10px; }
            100% { height: 30px; }
          }
          @keyframes pulse-glow {
            0% { box-shadow: 0 0 20px rgba(74, 108, 255, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.1); }
            100% { box-shadow: 0 0 60px rgba(74, 108, 255, 0.8), inset 0 0 40px rgba(255, 255, 255, 0.2); }
          }
          @keyframes float {
            0% { transform: translate(0, 0) rotate(0deg); opacity: 0.3; }
            50% { transform: translate(20px, -20px) rotate(180deg); opacity: 0.6; }
            100% { transform: translate(0, 0) rotate(360deg); opacity: 0.3; }
          }
          @keyframes ripple {
            0% { transform: scale(0.8); opacity: 1; }
            100% { transform: scale(1.2); opacity: 0; }
          }
        `}
      </style>
    </div>
  );
}
