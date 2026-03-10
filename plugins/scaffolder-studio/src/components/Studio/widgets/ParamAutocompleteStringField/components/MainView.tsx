import { useMemo } from 'react';
import { List, ListItemButton, Typography, Box, Divider } from '@mui/material';
import { NodeTypeColors } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { listItemButtonStyles } from './filterDefinitions';
import { getBackgroundColor } from '../../../utils/colorUtils';

export type MainViewOption =
  | { kind: 'next'; key: 'next-filters' }
  | { kind: 'param'; key: string; name: string }
  | { kind: 'output'; key: string; stepId: string; outputName: string };

export function getMainViewOptions(
  parameters: Array<{ name: string; type: string }>,
  outputs: Array<{ id: string; outputs: any }>,
): MainViewOption[] {
  const options: MainViewOption[] = [{ kind: 'next', key: 'next-filters' }];

  parameters.forEach(param => {
    options.push({
      kind: 'param',
      key: `param:${param.name}`,
      name: param.name,
    });
  });

  outputs.forEach(output => {
    if (!output.outputs) {
      return;
    }

    Object.keys(output.outputs).forEach(outputName => {
      options.push({
        kind: 'output',
        key: `output:${output.id}:${outputName}`,
        stepId: output.id,
        outputName,
      });
    });
  });

  return options;
}

interface MainViewProps {
  parameters: Array<{ name: string; type: string }>;
  outputs: Array<{ id: string; outputs: any }>;
  onParamSelect: (param: string) => void;
  onOutputSelect: (output: { stepId: string; outputName: string }) => void;
  onNext: () => void;
  activeOptionIndex?: number;
  onActiveOptionChange?: (index: number) => void;
}

export function MainView({
  parameters,
  outputs,
  onParamSelect,
  onOutputSelect,
  onNext,
  activeOptionIndex,
  onActiveOptionChange,
}: MainViewProps) {
  const options = useMemo(
    () => getMainViewOptions(parameters, outputs),
    [parameters, outputs],
  );
  const optionIndexByKey = useMemo(
    () => new Map(options.map((option, index) => [option.key, index] as const)),
    [options],
  );

  return (
    <>
      <List dense className="nodrag nopan" sx={{ py: 0 }}>
        <ListItemButton
          onClick={onNext}
          onMouseEnter={() => {
            const optionIndex = optionIndexByKey.get('next-filters');
            if (optionIndex !== undefined) {
              onActiveOptionChange?.(optionIndex);
            }
          }}
          selected={activeOptionIndex === optionIndexByKey.get('next-filters')}
          sx={{ ...listItemButtonStyles }}
        >
          <Typography
            variant="body2"
            sx={{
              fontStyle: 'italic',
              color: 'text.secondary',
              width: '100%',
              textAlign: 'center',
            }}
          >
            Filters &rarr;
          </Typography>
        </ListItemButton>
      </List>
      <Divider />
      {/* Parameters Section */}
      {parameters.length > 0 && (
        <>
          <List
            dense
            className="nodrag nopan"
            sx={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {parameters.map(param => (
              <Box key={param.name}>
                <ListItemButton
                  sx={{ ...listItemButtonStyles }}
                  selected={
                    activeOptionIndex ===
                    optionIndexByKey.get(`param:${param.name}`)
                  }
                  onMouseEnter={() => {
                    const optionIndex = optionIndexByKey.get(
                      `param:${param.name}`,
                    );
                    if (optionIndex !== undefined) {
                      onActiveOptionChange?.(optionIndex);
                    }
                  }}
                  onMouseDown={e => {
                    e.preventDefault();
                    onParamSelect(param.name);
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      width: '100%',
                    }}
                  >
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '2px',
                        backgroundColor: getBackgroundColor(param.type),
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      sx={{
                        textAlign: 'left',
                        flex: 1,
                      }}
                    >
                      {param.name}
                    </Typography>
                  </Box>
                </ListItemButton>
              </Box>
            ))}
          </List>
        </>
      )}

      {/* Outputs Section */}
      {outputs.length > 0 && (
        <>
          <List
            dense
            className="nodrag nopan"
            sx={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {outputs.map(
              (output: { id: string; outputs: any }) =>
                output.outputs && (
                  <Box
                    key={output.id}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        paddingBottom: 1,
                        color: 'gray',
                      }}
                    >
                      {output.id}
                    </Typography>
                    {Object.keys(output.outputs).map(key => (
                      <Box
                        key={key}
                        sx={{
                          display: 'flex',
                          justifyContent: 'flex-start',
                        }}
                      >
                        <ListItemButton
                          key={key}
                          selected={
                            activeOptionIndex ===
                            optionIndexByKey.get(`output:${output.id}:${key}`)
                          }
                          onMouseEnter={() => {
                            const optionIndex = optionIndexByKey.get(
                              `output:${output.id}:${key}`,
                            );
                            if (optionIndex !== undefined) {
                              onActiveOptionChange?.(optionIndex);
                            }
                          }}
                          onMouseDown={e => {
                            e.preventDefault();
                            onOutputSelect({
                              stepId: output.id,
                              outputName: key,
                            });
                          }}
                          sx={{ ...listItemButtonStyles }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              width: '100%',
                            }}
                          >
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '2px',
                                backgroundColor: NodeTypeColors.step,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                textAlign: 'left',
                                flex: 1,
                              }}
                            >
                              {key}
                            </Typography>
                          </Box>
                        </ListItemButton>
                      </Box>
                    ))}
                  </Box>
                ),
            )}
          </List>
        </>
      )}
    </>
  );
}
