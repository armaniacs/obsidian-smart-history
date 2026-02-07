/**
 * storage.test.js
 * Tests for storage.js constants
 */

import {
    MAX_URL_SET_SIZE,
    URL_WARNING_THRESHOLD
} from '../storage.js';

describe('Storage Constants', () => {
    describe('MAX_URL_SET_SIZE', () => {
        it('should be 10000', () => {
            expect(MAX_URL_SET_SIZE).toBe(10000);
        });
    });

    describe('URL_WARNING_THRESHOLD', () => {
        it('should be 8000', () => {
            expect(URL_WARNING_THRESHOLD).toBe(8000);
        });
    });
});