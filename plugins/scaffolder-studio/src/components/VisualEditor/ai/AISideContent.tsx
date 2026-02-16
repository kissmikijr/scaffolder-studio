import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  CircularProgress,
  useTheme,
} from '@mui/material';
import { StyledIconButton } from '../components/StyledIconButton';
import {
  discoveryApiRef,
  fetchApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import { useChat } from '@ai-sdk/react';

import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  UIMessage,
} from 'ai';
import { useParams } from 'react-router-dom';
import { useReactFlow, type Node, type Edge } from '@xyflow/react';
import { rehydrateNodes } from '../rehydrateNodes';
import { onChange } from '../handlers';
import { ScaffolderAction } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import StopCircle from '@mui/icons-material/StopCircle';
import { Streamdown } from 'streamdown';
import ArrowCircleUpIcon from '@mui/icons-material/ArrowCircleUp';
import {
  AllNodeData,
  StepNodeData,
  TemplateNodeData,
  ParametersNodeData,
  OutputNodeData,
} from '../types';

// Type for nodes that rehydrateNodes accepts
type RehydratableNodeData =
  | StepNodeData
  | TemplateNodeData
  | ParametersNodeData
  | OutputNodeData;

// Type definitions for tool outputs
interface ImportTemplateOutput {
  success: boolean;
  nodes: Node<RehydratableNodeData>[];
  edges: Edge[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

interface ActionDetailsInput {
  actionId: string;
}

interface ConversationResponse {
  messages?: UIMessage[];
  title?: string;
}

export const AISideContent = ({
  availableActions,
  conversationId,
}: {
  availableActions: ScaffolderAction[];
  conversationId?: string;
}) => {
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [chatTransport, setChatTransport] =
    useState<DefaultChatTransport<UIMessage> | null>(null);
  const { id } = useParams();
  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [chatTitle, setChatTitle] = useState<string | undefined>(undefined);
  // Load existing messages for the conversation
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setMessagesLoaded(false);
        const baseUrl = await discoveryApi.getBaseUrl(
          'scaffolder-studio-agent',
        );
        const response = await fetchApi.fetch(
          `${baseUrl}/${id}/conversations/${conversationId}`,
        );
        if (response.ok) {
          const conversation = (await response.json()) as ConversationResponse;
          if (conversation?.messages) {
            setInitialMessages(conversation.messages);
            setChatTitle(conversation.title);
          }
        }
      } catch (error) {
        console.error('Failed to load conversation messages:', error);
      } finally {
        setMessagesLoaded(true);
      }
    };

    if (conversationId) {
      loadMessages();
    } else {
      // No conversation ID means new conversation, so no messages to load
      setInitialMessages([]);
      setMessagesLoaded(true);
    }
  }, [conversationId, discoveryApi, id]);

  useEffect(() => {
    const getBaseUrl = async () => {
      try {
        const url = await discoveryApi.getBaseUrl(
          'scaffolder-studio-agent',
        );
        setBaseUrl(url);
      } catch (error) {
        console.error('Failed to get base URL:', error);
      }
    };

    getBaseUrl();
  }, [discoveryApi]);

  useEffect(() => {
    if (baseUrl) {
      const transport = new DefaultChatTransport({
        api: `${baseUrl}/chat/message`,
        fetch: fetchApi.fetch,
      });
      setChatTransport(transport);
    }
  }, [baseUrl]);

  // Don't render chat until we have the chat transport ready and messages loaded
  if (!chatTransport || !messagesLoaded) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          minHeight: 200,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <AISideContentWithChat
      key={conversationId} // Force re-render when conversation changes
      transport={chatTransport}
      availableActions={availableActions}
      conversationId={conversationId}
      initialMessages={initialMessages}
      chatTitle={chatTitle}
    />
  );
};
const AISideContentWithChat = ({
  transport,
  conversationId,
  initialMessages,
  chatTitle,
}: {
  transport: DefaultChatTransport<UIMessage>;
  availableActions: ScaffolderAction[];
  conversationId?: string;
  initialMessages: UIMessage[];
  chatTitle?: string;
}) => {
  const [inputValue, setInputValue] = useState('');
  const [stickyUserMessage, setStickyUserMessage] = useState<UIMessage | null>(
    null,
  );
  const theme = useTheme();
  const { id } = useParams();
  const { setNodes, setEdges, fitView } = useReactFlow();
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const messageRefs = React.useRef<Record<number, HTMLDivElement>>({});
  const inputRef = React.useRef<HTMLDivElement>(null);
  const [lastUserMessageIndex, setLastUserMessageIndex] = useState<number>(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status, stop, setMessages } = useChat({
    id: conversationId,
    transport,
    messages: initialMessages,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onFinish: result => {
      if (
        result.message.parts.some(part => part.type.includes('importTemplate'))
      ) {
        const importStep = result.message.parts.find(part =>
          part.type.includes('importTemplate'),
        );
        if (importStep && 'output' in importStep) {
          const output = importStep.output as ImportTemplateOutput;
          if (output?.success) {
            const rehydratedNodes = rehydrateNodes(output.nodes, {
              onChange: onChange(
                setNodes as React.Dispatch<
                  React.SetStateAction<Node<AllNodeData>[]>
                >,
              ),
              onAddProperty: () => { }, // Not used here as it's a preview/chat context
            });
            setNodes(rehydratedNodes as Node[]);
            setEdges(output.edges);
            fitView();
          }
        }
      }
    },
  });

  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  // Auto-scroll behavior when messages change
  useEffect(() => {
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const messageIndex = messages.length - 1;

    const scrollToMessage = () => {
      const container = scrollContainerRef.current;
      const messageElement = messageRefs.current[messageIndex];

      if (!container || !messageElement) return false;

      if (lastMessage.role === 'user') {
        setLastUserMessageIndex(messageIndex);
        messageElement.scrollIntoView({
          behavior: 'instant',
          block: 'start',
        });
      } else if (lastMessage.role === 'assistant') {
        // Scroll to the bottom to show the latest assistant message
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'instant',
        });
      }
      return true;
    };

    // Try to scroll immediately if elements are available
    if (scrollToMessage()) return;

    // If elements aren't ready, use MutationObserver to wait for DOM changes
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new MutationObserver(() => {
      // Use requestAnimationFrame to ensure layout is complete
      requestAnimationFrame(() => {
        if (scrollToMessage()) {
          observer.disconnect();
        }
      });
    });

    // Observe changes in the container
    observer.observe(container, {
      childList: true,
      subtree: true,
    });

    // Fallback timeout as safety net (much shorter than before)
    const fallbackTimeout = setTimeout(() => {
      observer.disconnect();
      scrollToMessage();
    }, 100);

    return () => {
      observer.disconnect();
      clearTimeout(fallbackTimeout);
    };
  }, [messages, status]);

  // Handle scroll to update sticky user message
  const handleScroll = React.useCallback(() => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const containerTop = container.scrollTop;

    // Find user messages and their positions
    const userMessages = messages.filter(msg => msg.role === 'user');
    let currentStickyMessage = null;

    // Check which user message should be sticky based on scroll position
    for (let i = userMessages.length - 1; i >= 0; i--) {
      const userMsgIndex = messages.findIndex(msg => msg === userMessages[i]);
      const messageElement = messageRefs.current[userMsgIndex];

      if (messageElement) {
        const messageTop = messageElement.offsetTop - container.offsetTop;
        if (messageTop <= containerTop + 80) {
          // 80px offset for sticky header height + padding
          currentStickyMessage = userMessages[i];
          break;
        }
      }
    }

    // Always show the latest user message as sticky if we have any
    if (!currentStickyMessage && userMessages.length > 0) {
      currentStickyMessage = userMessages[userMessages.length - 1];
    }

    setStickyUserMessage(currentStickyMessage);
  }, [messages, initialMessages]);

  // Set up scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    // Initial call to set sticky message
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    try {
      sendMessage({
        text: inputValue,
        metadata: {
          id: id,
          title: chatTitle,
        },
      });
      setInputValue('');
    } catch (error) {
      console.error(error);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'auto',
        width: '100%',
        maxWidth: '100%',
      }}
    >
      {/* Messages Container - Scrollable */}
      <Box
        ref={scrollContainerRef}
        sx={{
          height: `calc(100vh - 380px)`, // Fixed height for messages area
          maxHeight: `calc(100vh - 380px)`, // Fixed height for messages area
          overflowY: 'auto',
        }}
      >
        {messages.length > 0 && (
          <>
            {/* All messages */}
            {messages?.map((message, index) => {
              const isUser = message.role === 'user';
              return (
                <Box
                  key={index}
                  ref={(el: HTMLDivElement | null) => {
                    if (el) messageRefs.current[index] = el;
                  }}
                  sx={{
                    display: 'flex',
                    '&:not(:only-child):last-child': {
                      height: `calc(${scrollContainerRef.current?.clientHeight}px - ${messageRefs.current[lastUserMessageIndex]?.clientHeight}px - 16px)`,
                    },
                    mb: 1,
                    ...(isUser &&
                      stickyUserMessage &&
                      message.id === stickyUserMessage.id && {
                      top: 0,
                      position: 'sticky',
                    }),
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: '100%',
                      width: '100%',
                      px: 1,
                      py: 1,
                      borderRadius: 1.5,
                      border: theme =>
                        isUser ? `1px solid ${theme.palette.divider}` : 'none',
                      backgroundColor: isUser ? theme.palette.grey[800] : null,
                      fontSize: '0.875rem',
                      lineHeight: 1.4,
                    }}
                  >
                    {message.parts.map((part, partIndex) => {
                      switch (part.type) {
                        case 'text':
                          return (
                            <Typography
                              key={partIndex}
                              variant="body2"
                              component="div"
                              sx={{
                                whiteSpace: 'pre-wrap',
                                lineHeight: 1.4,
                                fontSize: 'inherit',
                                fontWeight: 400,
                              }}
                            >
                              <Streamdown
                                shikiTheme={['github-dark', 'github-light']}
                              >
                                {part.text}
                              </Streamdown>
                            </Typography>
                          );
                        case 'tool-availableActions':
                          if (
                            part.state === 'input-streaming' ||
                            part.state === 'input-available'
                          ) {
                            return (
                              <Typography
                                variant="body2"
                                key={part.toolCallId}
                                sx={{
                                  fontStyle: 'italic',
                                  opacity: 0.8,
                                  fontSize: 'inherit',
                                }}
                              >
                                {part.state === 'input-streaming'
                                  ? 'Fetching available actions...'
                                  : 'Available actions: '}
                              </Typography>
                            );
                          }
                          if (part.state === 'output-available') {
                            return (
                              <Typography
                                variant="body2"
                                key={part.toolCallId}
                                sx={{ fontSize: 'inherit' }}
                              >
                                Found the available actions
                              </Typography>
                            );
                          }
                          return <></>;
                        case 'tool-actionDetails':
                          if (
                            part.state === 'input-streaming' ||
                            part.state === 'input-available'
                          ) {
                            return (
                              <Typography
                                variant="body2"
                                key={part.toolCallId}
                                sx={{
                                  fontStyle: 'italic',
                                  opacity: 0.8,
                                  fontSize: 'inherit',
                                }}
                              >
                                {part.state === 'input-streaming'
                                  ? 'Fetching action details...'
                                  : 'Action details: '}
                              </Typography>
                            );
                          }
                          if (part.state === 'output-available') {
                            const input = part.input as ActionDetailsInput;
                            return (
                              <Typography
                                variant="body2"
                                key={part.toolCallId}
                                sx={{ fontSize: 'inherit' }}
                              >
                                {`Fetched details for action: ${input?.actionId || 'unknown'
                                  }`}
                              </Typography>
                            );
                          }
                          return <></>;
                        case 'tool-importTemplate':
                          if (
                            part.state === 'input-streaming' ||
                            part.state === 'input-available'
                          ) {
                            return (
                              <Typography
                                variant="body2"
                                key={part.toolCallId}
                                sx={{
                                  fontStyle: 'italic',
                                  opacity: 0.8,
                                  fontSize: 'inherit',
                                }}
                              >
                                Importing template...
                              </Typography>
                            );
                          }
                          if (part.state === 'output-available') {
                            return (
                              <Typography
                                variant="body2"
                                key={part.toolCallId}
                                sx={{ fontSize: 'inherit' }}
                              >
                                Template imported
                              </Typography>
                            );
                          }
                          return <></>;
                        default:
                          return null;
                      }
                    })}
                  </Box>
                </Box>
              );
            })}
            {status === 'submitted' && (
              <Box sx={{ height: '100px' }}>
                <CircularProgress />
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Input Area - Fixed at bottom */}
      <Box
        ref={inputRef}
        component="form"
        onSubmit={(e: React.FormEvent) => {
          e.preventDefault();
          handleSendMessage();
        }}
        sx={{
          mt: '80px',
          flexShrink: 0,
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1.5,
            backgroundColor: theme.palette.background.default,
            '&:focus-within': {
              borderColor: theme.palette.primary.main,
            },
          }}
        >
          {/* Context Indicator */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 1.5,
              marginTop: 1,
              backgroundColor: 'transparent',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                fontWeight: 500,
                border: `1px dashed ${theme.palette.divider}`,
                borderRadius: 2,
                padding: 0.25,
                margin: 1,
              }}
            >
              1 template
            </Typography>
          </Box>

          {/* Textarea */}
          <TextField
            fullWidth
            multiline
            minRows={2}
            maxRows={6}
            placeholder="Ask anything..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                pt: 0.5,
                '& fieldset': {
                  border: 'none',
                },
                '& .MuiInputBase-input': {
                  fontSize: '0.875rem',
                  lineHeight: 1.4,
                  mx: 0.3,
                  pr: 2, // Space for send button
                  resize: 'none',
                  '&::placeholder': {
                    color: theme.palette.text.secondary,
                    opacity: 0.7,
                  },
                },
              },
            }}
          />

          {/* Send/Stop Button */}
          <Box
            sx={{
              position: 'absolute',
              right: 8,
              bottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            {(status === 'submitted' || status === 'streaming') && (
              <>
                {status === 'submitted' && (
                  <CircularProgress size={16} thickness={4} />
                )}
                <StyledIconButton
                  type="button"
                  onClick={() => stop()}
                  size="small"
                  sx={{ p: 0.5 }}
                >
                  <StopCircle fontSize="small" />
                </StyledIconButton>
              </>
            )}

            <StyledIconButton
              type="submit"
              disabled={!inputValue.trim() || status !== 'ready'}
              size="small"
              sx={{
                p: 0.5,
                minWidth: 24,
                minHeight: 24,
                backgroundColor:
                  inputValue.trim() && status === 'ready'
                    ? theme.palette.primary.main
                    : 'transparent',
                color:
                  inputValue.trim() && status === 'ready'
                    ? theme.palette.primary.contrastText
                    : theme.palette.action.disabled,
                '&:hover': {
                  backgroundColor:
                    inputValue.trim() && status === 'ready'
                      ? theme.palette.primary.dark
                      : 'transparent',
                },
                '&.Mui-disabled': {
                  color: theme.palette.action.disabled,
                  backgroundColor: 'transparent',
                },
              }}
            >
              <ArrowCircleUpIcon sx={{ fontSize: '1rem' }} />
            </StyledIconButton>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
