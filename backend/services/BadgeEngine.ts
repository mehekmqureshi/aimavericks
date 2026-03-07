/**
 * Badge Engine Service
 * Assigns sustainability badges based on carbon footprint thresholds
 * 
 * Requirements: 5.1, 5.2, 5.3
 */

import { Badge } from '../../shared/types';

/**
 * Badge Engine class for assigning sustainability badges
 */
export class BadgeEngine {
  /**
   * Assigns a sustainability badge based on carbon footprint
   * 
   * Badge Assignment Rules:
   * - Carbon < 4 kg: "Environment Friendly" (green)
   * - Carbon 4-7 kg (inclusive): "Moderate Impact" (yellow)
   * - Carbon > 7 kg: "High Impact" (red)
   * 
   * Performance: Must complete within 100ms
   * 
   * @param carbonFootprint - Total carbon footprint in kg
   * @returns Badge object with name, color, and threshold
   */
  assignBadge(carbonFootprint: number): Badge {
    if (carbonFootprint < 4) {
      return {
        name: 'Environment Friendly',
        color: 'green',
        threshold: '< 4 kg'
      };
    } else if (carbonFootprint <= 7) {
      return {
        name: 'Moderate Impact',
        color: 'yellow',
        threshold: '4-7 kg'
      };
    } else {
      return {
        name: 'High Impact',
        color: 'red',
        threshold: '> 7 kg'
      };
    }
  }
}
