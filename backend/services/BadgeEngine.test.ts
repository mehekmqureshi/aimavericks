/**
 * Unit tests for Badge Engine Service
 * Tests badge assignment thresholds and performance
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { BadgeEngine } from './BadgeEngine';

describe('BadgeEngine', () => {
  let badgeEngine: BadgeEngine;

  beforeEach(() => {
    badgeEngine = new BadgeEngine();
  });

  describe('assignBadge', () => {
    it('should assign Environment Friendly badge for carbon < 4kg', () => {
      const badge = badgeEngine.assignBadge(3.5);
      
      expect(badge.name).toBe('Environment Friendly');
      expect(badge.color).toBe('green');
      expect(badge.threshold).toBe('< 4 kg');
    });

    it('should assign Moderate Impact badge for carbon = 4kg', () => {
      const badge = badgeEngine.assignBadge(4.0);
      
      expect(badge.name).toBe('Moderate Impact');
      expect(badge.color).toBe('yellow');
      expect(badge.threshold).toBe('4-7 kg');
    });

    it('should assign Moderate Impact badge for carbon = 7kg', () => {
      const badge = badgeEngine.assignBadge(7.0);
      
      expect(badge.name).toBe('Moderate Impact');
      expect(badge.color).toBe('yellow');
      expect(badge.threshold).toBe('4-7 kg');
    });

    it('should assign High Impact badge for carbon > 7kg', () => {
      const badge = badgeEngine.assignBadge(8.5);
      
      expect(badge.name).toBe('High Impact');
      expect(badge.color).toBe('red');
      expect(badge.threshold).toBe('> 7 kg');
    });

    describe('boundary values', () => {
      it('should assign Environment Friendly for 3.9kg', () => {
        const badge = badgeEngine.assignBadge(3.9);
        expect(badge.name).toBe('Environment Friendly');
        expect(badge.color).toBe('green');
      });

      it('should assign Moderate Impact for 4.0kg (lower boundary)', () => {
        const badge = badgeEngine.assignBadge(4.0);
        expect(badge.name).toBe('Moderate Impact');
        expect(badge.color).toBe('yellow');
      });

      it('should assign Moderate Impact for 7.0kg (upper boundary)', () => {
        const badge = badgeEngine.assignBadge(7.0);
        expect(badge.name).toBe('Moderate Impact');
        expect(badge.color).toBe('yellow');
      });

      it('should assign High Impact for 7.1kg', () => {
        const badge = badgeEngine.assignBadge(7.1);
        expect(badge.name).toBe('High Impact');
        expect(badge.color).toBe('red');
      });
    });

    describe('performance', () => {
      it('should complete badge assignment within 100ms', () => {
        const startTime = performance.now();
        badgeEngine.assignBadge(5.0);
        const endTime = performance.now();
        
        const executionTime = endTime - startTime;
        expect(executionTime).toBeLessThan(100);
      });

      it('should handle multiple assignments within performance threshold', () => {
        const testValues = [1.5, 3.9, 4.0, 5.5, 7.0, 7.1, 10.0];
        
        testValues.forEach(value => {
          const startTime = performance.now();
          badgeEngine.assignBadge(value);
          const endTime = performance.now();
          
          const executionTime = endTime - startTime;
          expect(executionTime).toBeLessThan(100);
        });
      });
    });

    describe('edge cases', () => {
      it('should handle zero carbon footprint', () => {
        const badge = badgeEngine.assignBadge(0);
        expect(badge.name).toBe('Environment Friendly');
        expect(badge.color).toBe('green');
      });

      it('should handle very small carbon footprint', () => {
        const badge = badgeEngine.assignBadge(0.001);
        expect(badge.name).toBe('Environment Friendly');
        expect(badge.color).toBe('green');
      });

      it('should handle very large carbon footprint', () => {
        const badge = badgeEngine.assignBadge(1000);
        expect(badge.name).toBe('High Impact');
        expect(badge.color).toBe('red');
      });
    });
  });
});
