import { fireEvent, render, screen } from '@testing-library/react';
import { PrefabStepOverrideDialog } from './PrefabStepOverrideDialog';

describe('PrefabStepOverrideDialog', () => {
  it('prefills the step id and name and submits trimmed values', () => {
    const onSubmit = jest.fn();

    render(
      <PrefabStepOverrideDialog
        open
        initialStepId="publish-1"
        initialName="Publish"
        existingStepIds={['build', 'deploy']}
        onCancel={jest.fn()}
        onSubmit={onSubmit}
      />,
    );

    const stepIdInput = screen.getByLabelText('Step ID');
    const stepNameInput = screen.getByLabelText('Step Name');

    expect(stepIdInput).toHaveValue('publish-1');
    expect(stepNameInput).toHaveValue('Publish');

    fireEvent.change(stepIdInput, { target: { value: '  publish-2  ' } });
    fireEvent.change(stepNameInput, {
      target: { value: '  Publish Copy  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Insert Prefab' }));

    expect(onSubmit).toHaveBeenCalledWith({
      stepId: 'publish-2',
      name: 'Publish Copy',
    });
  });

  it('blocks duplicate step ids until the value is unique', () => {
    const onSubmit = jest.fn();

    render(
      <PrefabStepOverrideDialog
        open
        initialStepId="publish-1"
        initialName="Publish"
        existingStepIds={['publish', 'deploy']}
        onCancel={jest.fn()}
        onSubmit={onSubmit}
      />,
    );

    const stepIdInput = screen.getByLabelText('Step ID');
    const submitButton = screen.getByRole('button', { name: 'Insert Prefab' });

    fireEvent.change(stepIdInput, { target: { value: 'publish' } });

    expect(screen.getByText('Step id already exists')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    fireEvent.change(stepIdInput, { target: { value: 'publish-2' } });
    fireEvent.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith({
      stepId: 'publish-2',
      name: 'Publish',
    });
  });
});
