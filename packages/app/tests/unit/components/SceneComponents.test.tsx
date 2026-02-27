import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { SceneCard } from '@/components/transcripts/SceneCard';
import { SceneList } from '@/components/transcripts/SceneList';
import { ExtractScenesButton } from '@/components/transcripts/ExtractScenesButton';
import { buildScene, CAMPAIGN_ID, TRANSCRIPT_ID } from '../helpers/builders';

// ---- Action mocks ----
const mockToggleSceneSelection = vi.fn();
const mockExtractScenes = vi.fn();

vi.mock('@/lib/actions/transcripts', () => ({
  toggleSceneSelection: (...args: unknown[]) => mockToggleSceneSelection(...args),
  extractScenes: (...args: unknown[]) => mockExtractScenes(...args),
  // other exports unused by these components
  generateSummary: vi.fn(),
  createTranscript: vi.fn(),
  updateTranscript: vi.fn(),
  deleteTranscript: vi.fn(),
  upsertSpeakerMapping: vi.fn(),
}));

const mockRouter = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
  mockToggleSceneSelection.mockResolvedValue({});
  mockExtractScenes.mockResolvedValue({});
});

// ===========================================================================
describe('SceneCard', () => {
  it('renders title, description, and mood badge', () => {
    render(<SceneCard scene={buildScene()} canWrite={false} />);
    expect(screen.getByText('The Dragon Awakens')).toBeInTheDocument();
    expect(screen.getByText(/ancient dragon rises/)).toBeInTheDocument();
    expect(screen.getByText('dramatic')).toBeInTheDocument();
  });

  it('renders timestamp range when both timestamps are present', () => {
    render(<SceneCard scene={buildScene({ start_timestamp: '00:30:00', end_timestamp: '00:45:00' })} canWrite={false} />);
    expect(screen.getByText(/00:30:00/)).toBeInTheDocument();
    expect(screen.getByText(/00:45:00/)).toBeInTheDocument();
  });

  it('does not render timestamp row when both timestamps are null', () => {
    render(<SceneCard scene={buildScene({ start_timestamp: null, end_timestamp: null })} canWrite={false} />);
    // Clock icon parent should not render
    expect(screen.queryByLabelText(/timestamp/i)).not.toBeInTheDocument();
  });

  it('renders dialogue preview lines', () => {
    render(<SceneCard scene={buildScene()} canWrite={false} />);
    expect(screen.getByText('[DM] The ground begins to tremble.')).toBeInTheDocument();
  });

  it('renders "+N more lines" when raw_speaker_lines exceeds 3', () => {
    const scene = buildScene({
      raw_speaker_lines: ['Line 1', 'Line 2', 'Line 3', 'Line 4', 'Line 5'],
    });
    render(<SceneCard scene={scene} canWrite={false} />);
    expect(screen.getByText('+2 more lines')).toBeInTheDocument();
  });

  it('shows checkbox when canWrite=true', () => {
    render(<SceneCard scene={buildScene()} canWrite={true} />);
    expect(screen.getByRole('button', { name: /deselect scene/i })).toBeInTheDocument();
  });

  it('does not show checkbox when canWrite=false', () => {
    render(<SceneCard scene={buildScene()} canWrite={false} />);
    expect(screen.queryByRole('button', { name: /select scene/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /deselect scene/i })).not.toBeInTheDocument();
  });

  describe('non-readOnly mode (default) — persists to DB', () => {
    it('calls onToggle with new selected state when clicked', async () => {
      const onToggle = vi.fn();
      render(<SceneCard scene={buildScene({ selected_for_video: true })} canWrite={true} onToggle={onToggle} />);
      await userEvent.click(screen.getByRole('button', { name: /deselect scene/i }));
      expect(onToggle).toHaveBeenCalledWith(expect.any(String), false);
    });

    it('calls toggleSceneSelection server action', async () => {
      render(<SceneCard scene={buildScene({ selected_for_video: true })} canWrite={true} />);
      await userEvent.click(screen.getByRole('button', { name: /deselect scene/i }));
      await waitFor(() => expect(mockToggleSceneSelection).toHaveBeenCalledWith(buildScene().id, false));
    });

    it('reverts local state and calls onToggle again when action returns error', async () => {
      mockToggleSceneSelection.mockResolvedValue({ error: 'Access denied' });
      const onToggle = vi.fn();
      render(<SceneCard scene={buildScene({ selected_for_video: true })} canWrite={true} onToggle={onToggle} />);
      await userEvent.click(screen.getByRole('button', { name: /deselect scene/i }));
      await waitFor(() => {
        // Called twice: optimistic toggle, then revert
        expect(onToggle).toHaveBeenCalledTimes(2);
        expect(onToggle).toHaveBeenLastCalledWith(expect.any(String), true);
      });
    });
  });

  describe('readOnly mode — local only, no DB call', () => {
    it('calls onToggle when clicked', async () => {
      const onToggle = vi.fn();
      render(<SceneCard scene={buildScene({ selected_for_video: true })} canWrite={true} readOnly={true} onToggle={onToggle} />);
      await userEvent.click(screen.getByRole('button', { name: /deselect scene/i }));
      expect(onToggle).toHaveBeenCalledWith(expect.any(String), false);
    });

    it('does NOT call toggleSceneSelection server action', async () => {
      render(<SceneCard scene={buildScene({ selected_for_video: true })} canWrite={true} readOnly={true} />);
      await userEvent.click(screen.getByRole('button', { name: /deselect scene/i }));
      await waitFor(() => expect(mockToggleSceneSelection).not.toHaveBeenCalled());
    });

    it('reflects selected_for_video from scene prop (controlled)', () => {
      const scene = buildScene({ selected_for_video: false });
      const { rerender } = render(<SceneCard scene={scene} canWrite={true} readOnly={true} />);
      expect(screen.getByRole('button', { name: /select scene/i })).toBeInTheDocument();
      rerender(<SceneCard scene={{ ...scene, selected_for_video: true }} canWrite={true} readOnly={true} />);
      expect(screen.getByRole('button', { name: /deselect scene/i })).toBeInTheDocument();
    });
  });
});

// ===========================================================================
describe('SceneList', () => {
  it('renders a SceneCard for each scene', () => {
    const scenes = [
      buildScene({ id: 'scene-a', title: 'Scene Alpha' }),
      buildScene({ id: 'scene-b', title: 'Scene Beta' }),
    ];
    render(<SceneList initialScenes={scenes} canWrite={false} />);
    expect(screen.getByText('Scene Alpha')).toBeInTheDocument();
    expect(screen.getByText('Scene Beta')).toBeInTheDocument();
  });

  it('passes canWrite=true down to SceneCards (checkboxes visible)', () => {
    const scenes = [buildScene({ selected_for_video: true })];
    render(<SceneList initialScenes={scenes} canWrite={true} />);
    expect(screen.getByRole('button', { name: /deselect scene/i })).toBeInTheDocument();
  });

  it('passes canWrite=false down to SceneCards (no checkboxes)', () => {
    const scenes = [buildScene()];
    render(<SceneList initialScenes={scenes} canWrite={false} />);
    expect(screen.queryByRole('button', { name: /select scene/i })).not.toBeInTheDocument();
  });

  it('updates scene selection in local state when toggled', async () => {
    const scene = buildScene({ selected_for_video: true });
    render(<SceneList initialScenes={[scene]} canWrite={true} />);
    // Starts selected
    expect(screen.getByRole('button', { name: /deselect scene/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /deselect scene/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /select scene/i })).toBeInTheDocument()
    );
  });
});

// ===========================================================================
describe('ExtractScenesButton', () => {
  it('shows "Extract Scenes" when hasScenes=false', () => {
    render(<ExtractScenesButton transcriptId={TRANSCRIPT_ID} campaignId={CAMPAIGN_ID} hasScenes={false} />);
    expect(screen.getByRole('button', { name: /extract scenes/i })).toBeInTheDocument();
    expect(screen.queryByText(/re-extract/i)).not.toBeInTheDocument();
  });

  it('shows "Re-extract Scenes" when hasScenes=true', () => {
    render(<ExtractScenesButton transcriptId={TRANSCRIPT_ID} campaignId={CAMPAIGN_ID} hasScenes={true} />);
    expect(screen.getByRole('button', { name: /re-extract scenes/i })).toBeInTheDocument();
  });

  it('button is disabled while pending', async () => {
    let resolve: (v: unknown) => void;
    mockExtractScenes.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<ExtractScenesButton transcriptId={TRANSCRIPT_ID} campaignId={CAMPAIGN_ID} hasScenes={false} />);
    fireEvent.click(screen.getByRole('button', { name: /extract scenes/i }));
    expect(await screen.findByRole('button', { name: /extracting/i })).toBeDisabled();
    resolve!({});
  });

  it('shows error message when action returns an error', async () => {
    mockExtractScenes.mockResolvedValue({ error: 'OpenAI API key not configured' });
    render(<ExtractScenesButton transcriptId={TRANSCRIPT_ID} campaignId={CAMPAIGN_ID} hasScenes={false} />);
    await userEvent.click(screen.getByRole('button', { name: /extract scenes/i }));
    expect(await screen.findByText(/openai api key not configured/i)).toBeInTheDocument();
  });

  it('calls router.refresh() on success', async () => {
    render(<ExtractScenesButton transcriptId={TRANSCRIPT_ID} campaignId={CAMPAIGN_ID} hasScenes={false} />);
    await userEvent.click(screen.getByRole('button', { name: /extract scenes/i }));
    await waitFor(() => expect(mockRouter.refresh).toHaveBeenCalled());
  });

  it('does not call router.refresh() when action returns an error', async () => {
    mockExtractScenes.mockResolvedValue({ error: 'Something went wrong' });
    render(<ExtractScenesButton transcriptId={TRANSCRIPT_ID} campaignId={CAMPAIGN_ID} hasScenes={false} />);
    await userEvent.click(screen.getByRole('button', { name: /extract scenes/i }));
    await waitFor(() => expect(screen.getByText(/something went wrong/i)).toBeInTheDocument());
    expect(mockRouter.refresh).not.toHaveBeenCalled();
  });

  it('passes the correct transcriptId and campaignId to extractScenes', async () => {
    render(<ExtractScenesButton transcriptId={TRANSCRIPT_ID} campaignId={CAMPAIGN_ID} hasScenes={false} />);
    await userEvent.click(screen.getByRole('button', { name: /extract scenes/i }));
    await waitFor(() =>
      expect(mockExtractScenes).toHaveBeenCalledWith(TRANSCRIPT_ID, CAMPAIGN_ID)
    );
  });
});
