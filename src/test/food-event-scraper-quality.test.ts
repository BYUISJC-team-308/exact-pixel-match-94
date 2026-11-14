import { describe, it, expect } from 'vitest';
import { validateFoodEventQuality } from '../../scripts/scrapers/food-event-validator.js';
import { extractRoom, resolveBuilding } from '../../scripts/scrapers/byu-building-resolver.js';

describe('Food Event Quality & Requirements Validator', () => {
  it('rejects incomplete posts like "free pizza in the wilk!"', () => {
    const post = {
      title: 'free pizza in the wilk!',
      building: 'Wilkinson Student Center',
      room: null,
      start_time: null,
      food: 'pizza',
    };
    const result = validateFoodEventQuality(post);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('Missing specific room number or designated room venue');
    expect(result.issues).toContain('Missing or invalid event start time');
  });

  it('rejects events with missing or generic room information', () => {
    const eventWithoutRoom = {
      title: 'Accounting Club Social',
      building: 'Tanner Building',
      room: '',
      start_time: '17:00:00',
      food: 'Free Pizza & Drinks',
    };
    const result = validateFoodEventQuality(eventWithoutRoom);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('Missing specific room number or designated room venue');

    const eventWithNotProvided = {
      title: 'Accounting Club Social',
      building: 'Tanner Building',
      room: 'Not provided',
      start_time: '17:00:00',
      food: 'Free Pizza & Drinks',
    };
    expect(validateFoodEventQuality(eventWithNotProvided).valid).toBe(false);
  });

  it('rejects events with missing or generic building', () => {
    const event = {
      title: 'Study Night Food',
      building: 'BYU Campus',
      room: 'Room 101',
      start_time: '18:00:00',
      food: 'Donuts',
    };
    const result = validateFoodEventQuality(event);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('Missing specific building name');
  });

  it('rejects events with missing or invalid start time', () => {
    const event = {
      title: 'Design Team Kickoff',
      building: 'Engineering Building',
      room: 'EB Event Space',
      start_time: '',
      food: 'Catered Sandwiches',
    };
    const result = validateFoodEventQuality(event);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('Missing or invalid event start time');
  });

  it('rejects events with generic or empty food specifications', () => {
    const event = {
      title: 'Department Seminar',
      building: 'Talmage Building',
      room: '1170',
      start_time: '11:00:00',
      food: 'food',
    };
    const result = validateFoodEventQuality(event);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('Missing specific type of food being offered');
  });

  it('accepts events containing all 5 required elements', () => {
    const completeEvent = {
      title: 'Leadership Workshop: Leverage Your Strengths',
      building: 'Engineering Building',
      room: 'EB Event Space',
      start_time: '16:00:00',
      food: 'Chick-fil-A Nuggets & Refreshments',
    };
    const result = validateFoodEventQuality(completeEvent);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });
});

describe('Building Resolver Room Extraction', () => {
  it('extracts numerical room numbers and alphanumerics', () => {
    expect(extractRoom('Talmage Building 1170')).toBe('1170');
    expect(extractRoom('TNRB W408')).toBe('W408');
    expect(extractRoom('3223 WSC')).toBe('3223');
    expect(extractRoom('Crabtree 214')).toBe('214');
    expect(extractRoom('4725 HBLL')).toBe('4725');
  });

  it('extracts designated venue rooms', () => {
    expect(extractRoom('EB Event Space')).toBe('Event Space');
    expect(extractRoom('Wilkinson Student Center - Garden Court')).toBe('Garden Court');
    expect(extractRoom('Main Ballroom, WSC')).toBe('Main Ballroom');
    expect(extractRoom('CTB Lobby (Second Floor)')).toBe('Lobby');
  });

  it('returns null when only the building is mentioned without a room', () => {
    expect(extractRoom('Wilkinson Student Center')).toBeNull();
    expect(extractRoom('Wilk')).toBeNull();
    expect(extractRoom('Tanner Building')).toBeNull();
    expect(extractRoom('Engineering Building')).toBeNull();
  });

  it('resolves building coordinates and metadata correctly', () => {
    const res = resolveBuilding('EB Event Space');
    expect(res.building).toBe('Engineering Building');
    expect(res.building_id).toBe('EB');
    expect(res.room).toBe('Event Space');
  });
});
