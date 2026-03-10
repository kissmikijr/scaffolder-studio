import { findAllTokens, parseTokenContent } from './tokenParser';

describe('tokenParser', () => {
  it('parses chained filters for a parameter token', () => {
    const text = 'parameters.property13 | abs| abs | lower | lower';
    const tokens = findAllTokens(text);

    expect(tokens).toHaveLength(1);
    expect(tokens[0].fullMatch).toBe(text);
    expect(tokens[0].content).toBe(text);
  });

  it('parses multiple parameter tokens with long chained filters', () => {
    const text =
      'parameters.property13 | abs| abs parameters.property13 | lower| lower | lower | lower | lower';
    const tokens = findAllTokens(text);

    expect(tokens).toHaveLength(2);
    expect(tokens[0].fullMatch).toBe('parameters.property13 | abs| abs');
    expect(tokens[1].fullMatch).toBe(
      'parameters.property13 | lower| lower | lower | lower | lower',
    );
  });

  it('parses chained step output filters including argument filters', () => {
    const text =
      'steps[\'build\'].output[\'repoUrl\'] | lower | replace("foo", "bar") | trim';
    const tokens = findAllTokens(text);

    expect(tokens).toHaveLength(1);
    expect(tokens[0].fullMatch).toBe(text);
    expect(tokens[0].content).toBe(text);

    const parsed = parseTokenContent(tokens[0].content);
    expect(parsed?.type).toBe('step');
    expect(parsed?.display).toBe(
      'build.repoUrl | lower | replace("foo", "bar") | trim',
    );
  });
});
