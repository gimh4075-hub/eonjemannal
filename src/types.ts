export interface Event {
  id: string;
  title: string;
  description: string | null;
  host_name: string;
  date_range_start: string;
  date_range_end: string;
  created_at: number;
}

export interface Participant {
  id: string;
  event_id: string;
  name: string;
  joined_at: number;
}

export interface DateOverlap {
  date: string;
  count: number;
  participants: string[];
  isPerfectMatch: boolean;
}

export interface AvailabilityResult {
  participants: Participant[];
  availability: Record<string, string[]>;
  overlaps: DateOverlap[];
  totalParticipants: number;
}

export interface VotesByDate {
  [date: string]: {
    count: number;
    voters: string[];
  };
}

export interface VotesResult {
  votesByDate: VotesByDate;
  myVotes: Record<string, string>;
}

export interface LocalParticipantInfo {
  participantId: string;
  name: string;
}
