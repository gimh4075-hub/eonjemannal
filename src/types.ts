export interface Event {
  id: string;
  title: string;
  description: string;
  hostName: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  createdAt: number;
}

export interface Participant {
  id: string;
  eventId: string;
  name: string;
  joinedAt: number;
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
