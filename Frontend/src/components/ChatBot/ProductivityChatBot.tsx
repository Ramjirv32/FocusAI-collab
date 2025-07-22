"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { MessageCircle, Send, X, Bot, User, Maximize2, Minimize2, Monitor, Clock, Check, BarChart3, AlertCircle } from 'lucide-react'
import axios from "axios"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

// Declare global interface for window functions
declare global {
  interface Window {
    toggleChatBot?: () => void
    processChatQuery?: (query: string) => void
  }
}

interface Message {
  id: number
  sender: "bot" | "user"
  content: {
    type: "text" | "usage" | "focus-score"
    text?: string
    usageData?: AppUsageData[]
    focusScore?: number
    productivityHours?: number
    distractionHours?: number
  }
}

interface AppUsageData {
  name: string
  duration: number
  category?: string
}

interface TabUsageData {
  domain: string
  duration: number
  category?: string
}

interface UsageSummary {
  productiveHours: number
  distractionHours: number
  neutralHours?: number
  totalActiveHours: number
  focusScore: number
}

const ProductivityChatBot = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "bot",
      content: {
        type: "text",
        text: "Hi! I'm your FocusAI assistant. I can help you understand your productivity patterns and app usage. Try asking about your focus score, most used apps, or productivity trends.",
      },
    },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.toggleChatBot = () => setIsOpen((prev) => !prev)
    window.processChatQuery = (query) => {
      setIsOpen(true)
      setInputMessage(query)
      setTimeout(() => sendMessage(query), 300)
    }

    return () => {
      delete window.toggleChatBot
      delete window.processChatQuery
    }
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Format time duration (seconds to readable format)
  const formatDuration = (seconds: number) => {
    if (!seconds) return '0s'
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    } else {
      return `${remainingSeconds}s`
    }
  }

  // Check if query should use existing flow or new API
  const shouldUseExistingFlow = (query: string): boolean => {
    const lowerQuery = query.toLowerCase()
    return (
      lowerQuery.includes('focus score') ||
      lowerQuery.includes('most used') ||
      lowerQuery.includes('app usage') ||
      lowerQuery.includes('website usage') ||
      lowerQuery.includes('show my')
    )
  }

  // Mock data functions for existing flow
  const getMockFocusData = () => {
    return {
      focusScore: 72,
      productivityHours: 4.5,
      distractionHours: 2.3
    }
  }

  const getMockAppUsage = () => {
    return [
      { name: "Visual Studio Code", duration: 7200, category: "productive" },
      { name: "Chrome", duration: 5400, category: "neutral" },
      { name: "Slack", duration: 3600, category: "communication" },
      { name: "YouTube", duration: 2100, category: "distracting" },
      { name: "Terminal", duration: 1800, category: "productive" }
    ]
  }

  const getMockWebsiteUsage = () => {
    return [
      { name: "github.com", duration: 4200, category: "productive" },
      { name: "stackoverflow.com", duration: 3600, category: "productive" },
      { name: "gmail.com", duration: 2400, category: "communication" },
      { name: "youtube.com", duration: 2100, category: "distracting" },
      { name: "reddit.com", duration: 1500, category: "distracting" }
    ]
  }

  const processExistingFlowQuery = (query: string) => {
    const lowerQuery = query.toLowerCase()
    
    if (lowerQuery.includes('focus score')) {
      const focusData = getMockFocusData()
      const botMessage: Message = {
        id: Date.now() + 1,
        sender: "bot",
        content: {
          type: "focus-score",
          text: "Here's your current focus score:",
          focusScore: focusData.focusScore,
          productivityHours: focusData.productivityHours,
          distractionHours: focusData.distractionHours,
        },
      }
      setMessages(prev => [...prev, botMessage])
    } else if (lowerQuery.includes('most used') || lowerQuery.includes('app usage')) {
      const appUsage = getMockAppUsage()
      const botMessage: Message = {
        id: Date.now() + 1,
        sender: "bot",
        content: {
          type: "usage",
          text: "Here are your most used applications:",
          usageData: appUsage,
        },
      }
      setMessages(prev => [...prev, botMessage])
    } else if (lowerQuery.includes('website usage')) {
      const websiteUsage = getMockWebsiteUsage()
      const botMessage: Message = {
        id: Date.now() + 1,
        sender: "bot",
        content: {
          type: "usage",
          text: "Here are your most visited websites:",
          usageData: websiteUsage,
        },
      }
      setMessages(prev => [...prev, botMessage])
    }
  }

  const processQuery = async (query: string) => {
    if (!query.trim()) return

    setIsLoading(true)

    // Add user message
    const userMessage: Message = {
      id: Date.now(),
      sender: "user",
      content: {
        type: "text",
        text: query.trim(),
      },
    }

    setMessages((prev) => [...prev, userMessage])

    try {
      // Check if should use existing flow
      if (shouldUseExistingFlow(query)) {
        processExistingFlowQuery(query)
        setIsLoading(false)
        return
      }

      // For other queries, use the new API
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }
      
      // Decode the JWT token to get user ID
      const tokenParts = token.split('.')
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format')
      }
      
      const decoded = JSON.parse(atob(tokenParts[1]))
      const userId = decoded.userId
      
      // Add a thinking message
      const thinkingMessage: Message = {
        id: Date.now() + 0.5,
        sender: "bot",
        content: {
          type: "text",
          text: "Thinking...",
        },
      }
      setMessages(prev => [...prev, thinkingMessage])

      // Call the new AI server with CORS support
      const aiResponse = await axios.post(
        `http://0.0.0.0:8000/api/v1/chat/ask/${userId}?question=${encodeURIComponent(query)}`,
        {},
        { 
          headers: { 
            'Content-Type': 'application/json'
          },
          withCredentials: false
        }
      )

      // Remove the thinking message and add the actual response
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== thinkingMessage.id)
        return [
          ...filtered,
          {
            id: Date.now() + 1,
            sender: "bot",
            content: {
              type: "text",
              text: aiResponse.data.response || aiResponse.data.answer || "I couldn't process your request at the moment.",
            },
          },
        ]
      })

    } catch (error) {
      console.error('Error processing query:', error)
      
      // Remove thinking message if it exists
      setMessages(prev => prev.filter(msg => msg.content.text !== "Thinking..."))
      
      let errorText = "Sorry, I encountered an error while processing your request."
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED' || error.message.includes('Network Error')) {
          errorText = "Connection error. Please check if the server is running and try again."
        } else if (error.response?.status === 404) {
          errorText = "API endpoint not found. Please check the server configuration."
        } else if (error.response?.status === 422) {
          errorText = "Invalid request format. Please try rephrasing your question."
        } else if (error.response?.status === 500) {
          errorText = "Server error. Please try again later."
        }
      }
      
      const errorMessage: Message = {
        id: Date.now() + 1,
        sender: "bot",
        content: {
          type: "text",
          text: errorText,
        },
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to determine app category
  const determineAppCategory = (appName: string): string => {
    const lowerName = appName.toLowerCase()
    
    if (
      lowerName.includes('code') || 
      lowerName.includes('intellij') || 
      lowerName.includes('visual studio') ||
      lowerName.includes('terminal') ||
      lowerName.includes('git')
    ) {
      return 'productive'
    }
    
    if (
      lowerName.includes('slack') || 
      lowerName.includes('teams') || 
      lowerName.includes('zoom') ||
      lowerName.includes('meet') ||
      lowerName.includes('outlook') ||
      lowerName.includes('gmail')
    ) {
      return 'communication'
    }
    
    if (
      lowerName.includes('youtube') || 
      lowerName.includes('netflix') || 
      lowerName.includes('game') ||
      lowerName.includes('spotify') ||
      lowerName.includes('music')
    ) {
      return 'distracting'
    }
    
    return 'neutral'
  }
  
  // Helper function to determine website category
  const determineWebsiteCategory = (domain: string): string => {
    const lowerDomain = domain.toLowerCase()
    
    if (
      lowerDomain.includes('github') || 
      lowerDomain.includes('stackoverflow') || 
      lowerDomain.includes('docs') ||
      lowerDomain.includes('gitlab') ||
      lowerDomain.includes('jira')
    ) {
      return 'productive'
    }
    
    if (
      lowerDomain.includes('gmail') || 
      lowerDomain.includes('outlook') || 
      lowerDomain.includes('slack') ||
      lowerDomain.includes('teams')
    ) {
      return 'communication'
    }
    
    if (
      lowerDomain.includes('youtube') || 
      lowerDomain.includes('facebook') || 
      lowerDomain.includes('instagram') ||
      lowerDomain.includes('netflix') ||
      lowerDomain.includes('twitter') ||
      lowerDomain.includes('reddit')
    ) {
      return 'distracting'
    }
    
    return 'neutral'
  }
  
  // Get color for category
  const getCategoryColor = (category?: string): string => {
    switch (category) {
      case 'productive':
        return 'bg-green-500'
      case 'communication':
        return 'bg-blue-500'
      case 'distracting':
        return 'bg-red-500'
      case 'neutral':
      default:
        return 'bg-gray-500'
    }
  }

  const sendMessage = async (customMessage?: string) => {
    const message = customMessage || inputMessage.trim()
    if (!message) return
    setInputMessage("")
    await processQuery(message)
  }

  // Updated suggested questions
  const suggestedQuestions = [
    "Show my focus score",
    "What apps am I using most?",
    "Show my website usage",
    "How productive was I today?"
  ]

  if (!isOpen) {
    // Collapsed chat button
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg bg-blue-600 hover:bg-blue-700 flex items-center justify-center"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    )
  }

  // Expanded chat interface
  return (
    <div
      className={`fixed z-50 transition-all duration-300 ease-in-out ${
        isExpanded ? "inset-0 bg-black/30" : "bottom-0 right-0 top-0 max-w-[450px] md:w-[450px] w-full"
      }`}
    >
      <div
        className={`bg-white flex flex-col h-full shadow-xl transition-all duration-300 ${
          isExpanded ? "w-full max-w-4xl mx-auto my-10 rounded-lg" : "w-full"
        }`}
      >
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center">
            <Bot className="h-6 w-6 mr-2" />
            <h2 className="font-semibold">FocusAI Assistant</h2>
          </div>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-white hover:bg-blue-700 mr-1"
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-blue-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gradient-to-b from-blue-50 to-white">
          {messages.map((message) => (
            <div key={message.id} className="animate-fadeIn">
              <div className={`flex items-start ${message.sender === "bot" ? "mr-12" : "ml-12 justify-end"}`}>
                {message.sender === "bot" && (
                  <div className="bg-blue-600 text-white p-1.5 rounded-full mr-3">
                    <Bot className="h-5 w-5" />
                  </div>
                )}
                <div
                  className={`rounded-xl text-sm shadow-sm ${
                    message.sender === "bot" ? "bg-white border border-blue-100" : "bg-blue-600 text-white"
                  }`}
                >
                  {message.content.type === "text" ? (
                    <div className="p-4 whitespace-pre-line">{message.content.text}</div>
                  ) : message.content.type === "usage" ? (
                    <div className="overflow-hidden">
                      <div className="p-3 border-b border-blue-50">
                        <p className="font-medium text-blue-800">{message.content.text}</p>
                      </div>

                      <div className="p-3">
                        <div className="space-y-3">
                          {message.content.usageData?.map((item, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${getCategoryColor(item.category)}`}></div>
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-medium">{item.name}</span>
                                  <span className="text-xs text-gray-500">{formatDuration(item.duration)}</span>
                                </div>
                                <Progress value={(item.duration / (message.content.usageData[0]?.duration || 1)) * 100} className="h-2" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : message.content.type === "focus-score" ? (
                    <div className="overflow-hidden">
                      <div className="p-3 border-b border-blue-50">
                        <p className="font-medium text-blue-800">{message.content.text}</p>
                      </div>

                      <div className="p-4">
                        <div className="flex justify-center mb-4">
                          <div className="relative w-24 h-24 flex items-center justify-center">
                            <div className="absolute inset-0 border-8 border-blue-100 rounded-full"></div>
                            <div 
                              className="absolute inset-0 border-8 border-transparent rounded-full"
                              style={{ 
                                borderTopColor: `${message.content.focusScore! > 75 ? '#22c55e' : message.content.focusScore! > 50 ? '#eab308' : '#ef4444'}`,
                                transform: `rotate(${45 + (message.content.focusScore! / 100) * 360}deg)` 
                              }}
                            ></div>
                            <div className="text-2xl font-bold">{message.content.focusScore!.toFixed(0)}%</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          <Card className="bg-green-50">
                            <CardContent className="p-3 text-center">
                              <div className="text-lg font-semibold text-green-700">{message.content.productivityHours!.toFixed(1)}h</div>
                              <div className="text-xs text-green-600">Productive Time</div>
                            </CardContent>
                          </Card>
                          <Card className="bg-red-50">
                            <CardContent className="p-3 text-center">
                              <div className="text-lg font-semibold text-red-700">{message.content.distractionHours!.toFixed(1)}h</div>
                              <div className="text-xs text-red-600">Distraction Time</div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                {message.sender === "user" && (
                  <div className="bg-gray-100 p-1.5 rounded-full ml-3">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start mr-12 animate-fadeIn">
              <div className="bg-blue-600 text-white p-1.5 rounded-full mr-3">
                <Bot className="h-5 w-5" />
              </div>
              <div className="bg-white border border-blue-100 p-4 rounded-xl shadow-sm">
                <div className="flex space-x-2 items-center">
                  <div
                    className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                    style={{ animationDelay: "600ms" }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested questions */}
        {messages.length < 3 && (
          <div className="p-3 bg-blue-50 border-t border-blue-100">
            <p className="text-xs text-gray-500 mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setInputMessage(question)
                    setTimeout(() => sendMessage(), 100)
                  }}
                  className="text-xs bg-white border border-blue-200 rounded-full px-3 py-1.5 hover:bg-blue-100 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="p-4 border-t bg-white shrink-0">
          <div className="flex items-end space-x-2">
            <div className="flex-1 relative">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about your productivity and app usage..."
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && !isLoading && sendMessage()}
                className="w-full pr-10 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
                rows={2}
                style={{ resize: "none" }}
              />
            </div>
            <Button
              onClick={() => sendMessage()}
              disabled={isLoading || !inputMessage.trim()}
              className={`rounded-xl h-10 ${inputMessage.trim() ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300"}`}
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
          <div className="text-xs text-gray-400 mt-2 text-center">
            Powered by FocusAI - Your productivity analysis assistant
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductivityChatBot