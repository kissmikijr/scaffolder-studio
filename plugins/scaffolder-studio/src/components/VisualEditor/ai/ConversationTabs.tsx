import {
  discoveryApiRef,
  fetchApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import { Box, Tabs, Tab, useTheme, Typography, Tooltip } from '@mui/material';
import { StyledIconButton } from '../components/StyledIconButton';
import React, { useEffect, useState, useCallback } from 'react';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { v4 as uuidv4 } from 'uuid';

interface ConversationTab {
  id: string;
  title: string;
  messageCount: number;
}

export const ConversationTabs = ({
  children,
  visualTemplateId,
}: {
  children: (conversationId: string) => React.ReactNode;
  visualTemplateId: string;
}) => {
  const [tabs, setTabs] = useState<ConversationTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);
  const theme = useTheme();

  const fetchConversations = useCallback(async () => {
    try {
      const baseUrl = await discoveryApi.getBaseUrl(
        'scaffolder-studio-agent',
      );
      const response = await fetchApi.fetch(
        `${baseUrl}/${visualTemplateId}/conversations`,
      );
      const conversations = await response.json();
      if (conversations.length === 0) {
        handleAddTab();
      }

      const conversationTabs = conversations.map((conv: any) => ({
        id: conv.id,
        title: conv.title,
        messageCount: conv.messages?.length || 0,
      }));

      setTabs(conversationTabs);

      // If no active tab and we have conversations, set the first one as active
      if (!activeTabId && conversationTabs.length > 0) {
        setActiveTabId(conversationTabs[conversationTabs.length - 1].id);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      // Create a new tab if fetch fails
      if (tabs.length === 0) {
        handleAddTab();
      }
    } finally {
      setLoading(false);
    }
  }, [discoveryApi, activeTabId, tabs.length]);

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleAddTab = useCallback(() => {
    const newTabId = uuidv4();
    const newTab: ConversationTab = {
      id: newTabId,
      title: `New Chat`,
      messageCount: 0,
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTabId);
  }, []);

  const handleCloseTab = useCallback(
    async (tabId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();

      try {
        const baseUrl = await discoveryApi.getBaseUrl(
          'scaffolder-studio-agent',
        );
        await fetchApi.fetch(`${baseUrl}/conversations/${tabId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Failed to delete conversation:', error);
      }

      setTabs(prev => {
        const newTabs = prev.filter(tab => tab.id !== tabId);

        // If we're closing the active tab, switch to another tab
        if (tabId === activeTabId) {
          if (newTabs.length > 0) {
            // Switch to the next tab, or the previous one if it was the last
            const currentIndex = prev.findIndex(tab => tab.id === tabId);
            const nextTab = newTabs[Math.min(currentIndex, newTabs.length - 1)];
            setActiveTabId(nextTab.id);
          } else {
            // No tabs left, create a new one
            handleAddTab();
            return prev; // Return original tabs since handleAddTab will update them
          }
        }

        return newTabs;
      });
    },
    [activeTabId, discoveryApi, handleAddTab],
  );

  const handleTabChange = useCallback(
    (_: React.SyntheticEvent, newTabId: string) => {
      setActiveTabId(newTabId);
    },
    [],
  );

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Loading conversations...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {/* Tab Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          minHeight: 8,
        }}
      >
        <Tabs
          value={activeTabId}
          onChange={handleTabChange}
          variant="scrollable"
          visibleScrollbar
          scrollButtons={false}
          TabIndicatorProps={{
            sx: {
              display: 'none',
              paddingBottom: 0,
              height: 0,
            },
          }}
          sx={{
            flex: 1,
            '& .MuiTab-root': {
              minHeight: 8,
              textTransform: 'none',
              fontSize: '0.10rem',
              minWidth: 10,
              maxWidth: 110,
            },
            '& .MuiTabs-scroller': {
              overflowX: 'scroll',
              overflowY: 'hidden',
              scrollbarGutter: 'stable both-edges',
              scrollbarWidth: 'thin',
              scrollbarColor: 'transparent transparent',
              '&::-webkit-scrollbar': {
                height: 4, // thinner horizontal scrollbar
              },
              '&:hover': {
                scrollbarColor: `${theme.palette.divider} transparent`,
              },
            },
          }}
        >
          {tabs.length > 0 &&
            tabs.map(tab => (
              <Tab
                key={tab.id}
                value={tab.id}
                sx={{
                  color: 'rgba(0, 0, 0, 0.9)',
                  overflow: 'visible',
                  minHeight: 8,
                  height: 16,
                  minWidth: 10,
                  maxWidth: 110,
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0)',
                    color: 'white',
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    '& .MuiTypography-root': {
                      color: 'white',
                    },
                  },
                  '&.MuiButtonBase-root': {
                    borderRadius: '6px',
                  },
                  '& .MuiTab-wrapper': { width: '100%', alignItems: 'stretch' },
                }}
                label={
                  <Tooltip enterDelay={1000} title={tab.title}>
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '6px',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        '&:hover .close-button': {
                          opacity: 1,
                          background:
                            tab.id === activeTabId
                              ? `linear-gradient(to right, transparent 0%, ${theme.palette.background.paper} 30%, ${theme.palette.background.paper} 100%)`
                              : `linear-gradient(to right, transparent 0%, ${theme.palette.background.default} 30%, ${theme.palette.background.default} 100%)`,
                        },
                        '& .close-button': {
                          position: 'absolute',
                        },
                        minWidth: 0,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'rgba(255, 255, 255, 0.4)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 120,
                          p: 1,
                          '&:hover': {
                            color: 'rgba(255, 255, 255, 1)',
                          },
                        }}
                      >
                        {tab?.title || 'New Chat'}
                      </Typography>
                      <Box
                        className="close-button"
                        sx={{
                          opacity: 0,
                          width: '16px',
                          height: '16px',
                          paddingLeft: '8px',
                          paddingRight: '4px',
                          borderTopRightRadius: '6px',
                          borderBottomRightRadius: '6px',
                          position: 'absolute',
                          right: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <StyledIconButton
                          size="small"
                          onClick={e => handleCloseTab(tab.id, e)}
                          sx={{
                            backgroundColor: 'transparent',
                            '&:hover': {
                              backgroundColor: 'transparent',
                            },
                            '& .MuiSvgIcon-root': {
                              fontSize: '12px',
                            },
                          }}
                        >
                          <CloseIcon
                            sx={{
                              color: 'rgba(255, 255, 255, 1)',
                            }}
                          />
                        </StyledIconButton>
                      </Box>
                    </Box>
                  </Tooltip>
                }
              />
            ))}
        </Tabs>

        {/* Add Tab Button */}
        <StyledIconButton
          onClick={handleAddTab}
          size="small"
          sx={{
            ml: 1,
            mr: 1,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          }}
        >
          <AddIcon
            sx={{
              color: 'rgba(255, 255, 255, 0.4)',
              fontSize: 8,
            }}
          />
        </StyledIconButton>
      </Box>

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {activeTabId && children(activeTabId)}
      </Box>
    </Box>
  );
};
