/**
 * Virtual Scroll Manager Tests
 * Tests core logic without DOM rendering dependencies
 */
const { DynamicVirtualScroll } = require('../../src/utils/virtual-scroll.js');

// Mock window and document for tests
global.window = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  scrollY: 0,
  innerHeight: 800
};
global.document = {
  createElement: function(tag) {
    return {
      tagName: tag.toUpperCase(),
      style: {},
      className: '',
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      setAttribute: jest.fn(),
      getAttribute: jest.fn(),
      childNodes: [],
      childElementCount: 0,
      getBoundingClientRect: () => ({ height: 100 })
    };
  }
};

describe('DynamicVirtualScroll', () => {
  let container;
  let scroll;

  beforeEach(() => {
    // Create a mock container
    container = {
      innerHTML: '',
      style: {},
      clientHeight: 500,
      scrollTop: 0,
      appendChild: jest.fn(),
      querySelector: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
    container.querySelector.mockReturnValue(null);

    scroll = new DynamicVirtualScroll(container, {
      estimatedHeight: 100,
      buffer: 5
    });
  });

  afterEach(() => {
    if (scroll) {
      scroll.destroy();
    }
  });

  describe('Basic Operations', () => {
    test('should initialize with default options', () => {
      expect(scroll.estimatedHeight).toBe(100);
      expect(scroll.buffer).toBe(5);
      expect(scroll.items).toEqual([]);
      expect(scroll.positions).toEqual([]);
    });

    test('should initialize without auto-render', () => {
      // Just verify the instance was created
      expect(scroll).toBeInstanceOf(DynamicVirtualScroll);
    });
  });

  describe('Index Mapping', () => {
    test('should return correct virtual index', () => {
      // Manually set up the mapping without calling setItems (which triggers render)
      scroll.items = ['a', 'b', 'c'];
      scroll.itemToVirtualIndex = new Map([[0, 0], [1, 1], [2, 2]]);
      scroll.virtualToItem = ['a', 'b', 'c'];

      expect(scroll.getVirtualIndex(0)).toBe(0);
      expect(scroll.getVirtualIndex(1)).toBe(1);
      expect(scroll.getVirtualIndex(2)).toBe(2);
    });

    test('should return -1 for non-existent index', () => {
      scroll.items = ['a', 'b'];
      scroll.itemToVirtualIndex = new Map([[0, 0], [1, 1]]);

      expect(scroll.getVirtualIndex(99)).toBe(-1);
    });

    test('should return item at virtual index', () => {
      scroll.items = ['a', 'b', 'c'];
      scroll.virtualToItem = ['a', 'b', 'c'];

      expect(scroll.getItemAt(0)).toBe('a');
      expect(scroll.getItemAt(1)).toBe('b');
      expect(scroll.getItemAt(2)).toBe('c');
    });

    test('should return undefined for out of bounds index', () => {
      scroll.items = ['a'];
      scroll.virtualToItem = ['a'];

      expect(scroll.getItemAt(99)).toBeUndefined();
    });
  });

  describe('Scroll Operations', () => {
    test('should get scroll position', () => {
      scroll.scrollTop = 100;
      expect(scroll.getScrollTop()).toBe(100);
    });

    test('should set scroll position with clamping', () => {
      scroll.totalHeight = 1000;
      scroll.container.clientHeight = 500;

      scroll.setScrollTop(2000);
      expect(scroll.scrollTop).toBe(500); // Clamped to max

      scroll.setScrollTop(-100);
      expect(scroll.scrollTop).toBe(0); // Clamped to min
    });

    test('should get viewport height', () => {
      expect(scroll.getViewportHeight()).toBe(500);
    });

    test('should get item height from cache or estimate', () => {
      scroll.estimatedHeight = 100;
      scroll.measuredHeights.set(0, 150);

      expect(scroll.getItemHeight(0)).toBe(150);
      expect(scroll.getItemHeight(1)).toBe(100); // Estimated
    });

    test('should get total height', () => {
      scroll.totalHeight = 500;
      expect(scroll.getTotalHeight()).toBe(500);
    });
  });

  describe('Binary Search', () => {
    test('should find index near position', () => {
      scroll.positions = [0, 100, 250, 400, 600];
      scroll.items = [1, 2, 3, 4, 5];

      expect(scroll.findIndexNear(0)).toBe(0);
      expect(scroll.findIndexNear(50)).toBe(0);
      expect(scroll.findIndexNear(100)).toBe(1);
      expect(scroll.findIndexNear(300)).toBe(2);
      expect(scroll.findIndexNear(500)).toBe(3);
      expect(scroll.findIndexNear(600)).toBe(4);
    });

    test('should handle empty positions', () => {
      scroll.positions = [];
      scroll.items = [];

      expect(scroll.findIndexNear(0)).toBe(0);
    });

    test('should handle edge cases', () => {
      scroll.positions = [0, 100, 200];
      scroll.items = [1, 2, 3];

      expect(scroll.findIndexNear(-10)).toBe(0);
      expect(scroll.findIndexNear(1000)).toBe(2);
    });
  });

  describe('Scroll To Index', () => {
    test('should handle non-existent index', () => {
      scroll.setScrollTop = jest.fn();
      scroll.scrollToIndex(999);

      expect(scroll.setScrollTop).not.toHaveBeenCalled();
    });

    test('should scroll to index when visible', () => {
      scroll.items = Array.from({ length: 10 }, (_, i) => i);
      scroll.positions = Array.from({ length: 11 }, (_, i) => i * 100);
      scroll.measuredHeights = new Map();
      for (let i = 0; i < 10; i++) {
        scroll.measuredHeights.set(i, 100);
      }
      scroll.itemToVirtualIndex = new Map();
      for (let i = 0; i < 10; i++) {
        scroll.itemToVirtualIndex.set(i, i);
      }
      scroll.totalHeight = 1000;
      scroll.container.clientHeight = 500;
      scroll.scrollTop = 0;
      scroll.setScrollTop = jest.fn();

      scroll.scrollToIndex(3, { align: 'start' });

      expect(scroll.setScrollTop).toHaveBeenCalledWith(300);
    });
  });

  describe('Destroy', () => {
    test('should clean up event listeners', () => {
      scroll.container.removeEventListener = jest.fn();
      global.window.removeEventListener = jest.fn();

      scroll.destroy();

      expect(scroll.container.removeEventListener).toHaveBeenCalledWith('scroll', scroll.handleScroll);
      expect(global.window.removeEventListener).toHaveBeenCalledWith('resize', scroll.handleResize);
    });

    test('should clear all state', () => {
      scroll.items = [1, 2, 3];
      scroll.positions = [0, 100, 200, 300];
      scroll.measuredHeights.set(0, 100);
      scroll.itemToVirtualIndex.set(0, 0);

      scroll.destroy();

      expect(scroll.items).toEqual([]);
      expect(scroll.positions).toEqual([]);
      expect(scroll.measuredHeights.size).toBe(0);
      expect(scroll.renderFn).toBeNull();
    });
  });

  describe('Statistics', () => {
    test('should return correct stats', () => {
      scroll.items = [1, 2, 3];
      scroll.totalHeight = 300;
      scroll.measuredHeights.set(0, 100);
      scroll.measuredHeights.set(1, 100);

      const stats = scroll.getStats();

      expect(stats.totalItems).toBe(3);
      expect(stats.totalHeight).toBe(300);
      expect(stats.measuredCount).toBe(2);
      expect(stats.bufferSize).toBe(5);
      expect(stats.estimatedHeight).toBe(100);
    });
  });

  describe('Position Recalculation', () => {
    test('should recalculate positions with measured heights', () => {
      scroll.items = [1, 2, 3];
      scroll.measuredHeights.set(0, 100);
      scroll.measuredHeights.set(1, 150);
      scroll.measuredHeights.set(2, 80);

      scroll.recalculatePositions();

      expect(scroll.positions).toEqual([0, 100, 250, 330]);
      expect(scroll.totalHeight).toBe(330);
    });
  });

  describe('Window Scroll Mode', () => {
    test('should use window scroll when configured', () => {
      const windowScrollScroll = new DynamicVirtualScroll(container, {
        estimatedHeight: 100,
        useWindowScroll: true
      });

      expect(global.window.addEventListener).toHaveBeenCalledWith('scroll', windowScrollScroll.handleScroll, { passive: true });

      windowScrollScroll.destroy();
    });
  });

  describe('Event Handlers', () => {
    test('should handle scroll event', () => {
      scroll.scrollTop = 0;
      scroll.render = jest.fn();

      scroll.handleScroll();

      expect(scroll.render).toHaveBeenCalled();
    });

    test('should handle resize event', () => {
      scroll.refresh = jest.fn();

      scroll.handleResize();

      expect(scroll.refresh).toHaveBeenCalled();
    });

    test('should handle scroll top update', () => {
      scroll.container.scrollTop = 0;
      scroll.scrollTop = 0;
      scroll.totalHeight = 1000;
      scroll.render = jest.fn(); // Mock render to avoid issues

      scroll.setScrollTop(200);

      expect(scroll.scrollTop).toBe(200);
      expect(scroll.container.scrollTop).toBe(200);
    });
  });

  describe('Visible Range', () => {
    test('should calculate visible range correctly', () => {
      scroll.positions = [0, 100, 200, 300, 400, 500];
      scroll.items = [1, 2, 3, 4, 5];
      scroll.buffer = 2;

      // Simulate scroll position
      scroll.scrollTop = 150;
      scroll.container.clientHeight = 200;

      const startIndex = scroll.findIndexNear(150);
      const endIndex = scroll.findIndexNear(350);

      expect(startIndex).toBe(1); // Position 200 is first >= 150
      expect(endIndex).toBe(3); // Position 400 is first >= 350
    });
  });
});
