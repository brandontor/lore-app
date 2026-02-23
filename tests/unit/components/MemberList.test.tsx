import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemberList } from '@/components/campaigns/MemberList';
import { buildMember, buildInvitation, CAMPAIGN_ID } from '../helpers/builders';

const mockUpdateMemberPermission = vi.fn();
const mockRemoveMember = vi.fn();
const mockRevokeInvitation = vi.fn();

vi.mock('@/lib/actions/members', () => ({
  updateMemberPermission: (...args: unknown[]) => mockUpdateMemberPermission(...args),
  removeMember: (...args: unknown[]) => mockRemoveMember(...args),
}));

vi.mock('@/lib/actions/invitations', () => ({
  revokeInvitation: (...args: unknown[]) => mockRevokeInvitation(...args),
  sendInvitation: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateMemberPermission.mockResolvedValue({});
  mockRemoveMember.mockResolvedValue({});
  mockRevokeInvitation.mockResolvedValue({});
});

const defaultProps = {
  members: [],
  invitations: [],
  campaignId: CAMPAIGN_ID,
  ownerName: 'DM Alice',
};

describe('MemberList', () => {
  it('always renders the owner row with Owner badge', () => {
    render(<MemberList {...defaultProps} />);
    expect(screen.getByText('DM Alice')).toBeInTheDocument();
    expect(screen.getAllByText('Owner')).toHaveLength(2); // heading + badge
  });

  it('renders a row for each member', () => {
    const members = [
      buildMember({ profile: { id: 'a', display_name: 'Player One', avatar_url: null } }),
      buildMember({ user_id: 'b', profile: { id: 'b', display_name: 'Player Two', avatar_url: null } }),
    ];
    render(<MemberList {...defaultProps} members={members} />);
    expect(screen.getByText('Player One')).toBeInTheDocument();
    expect(screen.getByText('Player Two')).toBeInTheDocument();
  });

  it('shows "No other members yet" when members array is empty', () => {
    render(<MemberList {...defaultProps} />);
    expect(screen.getByText(/no other members/i)).toBeInTheDocument();
  });

  it('calls updateMemberPermission when permission select changes', async () => {
    const member = buildMember({ permission: 'read' });
    const user = userEvent.setup();
    render(<MemberList {...defaultProps} members={[member]} />);
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'write');
    expect(mockUpdateMemberPermission).toHaveBeenCalledWith(member.id, CAMPAIGN_ID, 'write');
  });

  it('calls removeMember when Remove button is clicked', async () => {
    const member = buildMember();
    const user = userEvent.setup();
    render(<MemberList {...defaultProps} members={[member]} />);
    await user.click(screen.getByRole('button', { name: /remove/i }));
    expect(mockRemoveMember).toHaveBeenCalledWith(member.id, CAMPAIGN_ID);
  });

  it('does not render pending invitations section when invitations is empty', () => {
    render(<MemberList {...defaultProps} />);
    expect(screen.queryByText(/pending invitations/i)).not.toBeInTheDocument();
  });

  it('renders pending invitations section when invitations exist', () => {
    const inv = buildInvitation({ email: 'pending@example.com' });
    render(<MemberList {...defaultProps} invitations={[inv]} />);
    expect(screen.getByText(/pending invitations/i)).toBeInTheDocument();
    expect(screen.getByText('pending@example.com')).toBeInTheDocument();
  });

  it('calls revokeInvitation when Revoke button is clicked', async () => {
    const inv = buildInvitation();
    const user = userEvent.setup();
    render(<MemberList {...defaultProps} invitations={[inv]} />);
    await user.click(screen.getByRole('button', { name: /revoke/i }));
    expect(mockRevokeInvitation).toHaveBeenCalledWith(inv.id, CAMPAIGN_ID);
  });
});
