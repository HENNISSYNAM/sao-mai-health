import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Send, Bot, User, Loader2, X, Minimize2 } from 'lucide-react'
import { toast } from 'sonner'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AIAssistantProps {
  position?: 'corner' | 'inline'
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ position = 'corner' }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Xin chào! Tôi là trợ lý AI của hệ thống giám sát y tế. Tôi có thể giúp bạn phân tích dữ liệu, giải thích các chỉ số sức khỏe và trả lời câu hỏi về hệ thống. Bạn cần hỗ trợ gì?',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [showApiKeyInput, setShowApiKeyInput] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return
    
    if (!apiKey.trim()) {
      toast.error('Vui lòng nhập OpenRouter API key')
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'HCMC Health Hub'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3.5-sonnet',
          messages: [
            {
              role: 'system',
              content: 'Bạn là trợ lý AI chuyên về y tế công cộng và giám sát sức khỏe tại TP. Hồ Chí Minh. Bạn giúp phân tích dữ liệu y tế, giải thích các chỉ số sức khỏe, cảnh báo dịch bệnh và hỗ trợ người dùng hiểu hệ thống giám sát. Trả lời bằng tiếng Việt, ngắn gọn và chuyên nghiệp.'
            },
            ...messages.slice(-5).map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            {
              role: 'user',
              content: userMessage.content
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.choices[0].message.content,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      console.error('Error calling OpenRouter API:', error)
      toast.error('Có lỗi xảy ra khi gọi AI. Vui lòng kiểm tra API key và thử lại.')
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Xin lỗi, tôi gặp sự cố kỹ thuật. Vui lòng thử lại sau.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleApiKeySubmit = () => {
    if (apiKey.trim()) {
      setShowApiKeyInput(false)
      toast.success('API key đã được lưu!')
    }
  }

  if (position === 'corner') {
    return (
      <>
        {/* Floating Chat Button */}
        {!isOpen && (
          <Button
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50"
            size="lg"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        )}

        {/* Chat Window */}
        {isOpen && (
          <Card className="fixed bottom-6 right-6 w-96 h-[500px] shadow-2xl z-50 flex flex-col">
            <CardHeader className="pb-2 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Trợ lý AI</CardTitle>
                  <Badge variant="secondary" className="text-xs">Trực tuyến</Badge>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="h-8 w-8 p-0"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {!isMinimized && (
              <CardContent className="flex-1 flex flex-col p-4 gap-3">
                {/* API Key Input */}
                {showApiKeyInput && (
                  <div className="bg-muted/30 p-3 rounded-lg border border-dashed">
                    <p className="text-xs text-muted-foreground mb-2">
                      Nhập OpenRouter API key để sử dụng AI:
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder="API key..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="text-xs"
                      />
                      <Button
                        onClick={handleApiKeySubmit}
                        size="sm"
                        disabled={!apiKey.trim()}
                      >
                        Lưu
                      </Button>
                    </div>
                  </div>
                )}

                {/* Messages */}
                <ScrollArea className="flex-1 pr-3">
                  <div className="space-y-3">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {message.role === 'assistant' && (
                          <Bot className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                        )}
                        <div
                          className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {message.content}
                        </div>
                        {message.role === 'user' && (
                          <User className="h-6 w-6 text-muted-foreground mt-1 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-2 justify-start">
                        <Bot className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                        <div className="bg-muted p-3 rounded-2xl">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div ref={messagesEndRef} />
                </ScrollArea>

                {/* Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Hỏi về dữ liệu y tế, cảnh báo..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading || showApiKeyInput}
                    className="text-sm"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading || showApiKeyInput}
                    size="sm"
                    className="flex-shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        )}
      </>
    )
  }

  // Inline version for embedding in pages
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <CardTitle>Trợ lý AI Y tế</CardTitle>
          <Badge variant="secondary">Trực tuyến</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* API Key Input */}
        {showApiKeyInput && (
          <div className="bg-muted/30 p-4 rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground mb-3">
              Nhập OpenRouter API key để sử dụng trợ lý AI:
            </p>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="sk-or-v1-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <Button onClick={handleApiKeySubmit} disabled={!apiKey.trim()}>
                Kích hoạt
              </Button>
            </div>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="h-80">
          <div className="space-y-4 pr-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <Bot className="h-8 w-8 text-primary mt-1 flex-shrink-0" />
                )}
                <div
                  className={`max-w-[85%] p-4 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {message.content}
                </div>
                {message.role === 'user' && (
                  <User className="h-8 w-8 text-muted-foreground mt-1 flex-shrink-0" />
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <Bot className="h-8 w-8 text-primary mt-1 flex-shrink-0" />
                <div className="bg-muted p-4 rounded-2xl">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Hỏi về dữ liệu y tế, phân tích xu hướng, cảnh báo dịch bệnh..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading || showApiKeyInput}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading || showApiKeyInput}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}