/**
 * Dynamic Virtual Scroll Manager
 * Handles efficient rendering of large lists with variable-height items
 */
class DynamicVirtualScroll {
  constructor(container, options = {}) {
    this.container = container;
    this.estimatedHeight = options.estimatedHeight || 80;
    this.buffer = options.buffer || 10;
    this.useWindowScroll = options.useWindowScroll || false;

    this.items = [];
    this.positions = [];
    this.measuredHeights = new Map();
    this.itemToVirtualIndex = new Map();
    this.virtualToItem = [];
    this.scrollTop = 0;
    this.totalHeight = 0;
    this.renderFn = null;
    this.onVisibleRangeChange = null;

    this.handleScroll = this.handleScroll.bind(this);
    this.handleResize = this.handleResize.bind(this);

    if (this.useWindowScroll) {
      window.addEventListener('scroll', this.handleScroll, { passive: true });
    } else {
      this.container.addEventListener('scroll', this.handleScroll, { passive: true });
    }
    window.addEventListener('resize', this.handleResize, { passive: true });
  }

  setItems(items, renderFn, options = {}) {
    this.items = items;
    this.renderFn = renderFn;
    this.onVisibleRangeChange = options.onVisibleRangeChange;

    this.itemToVirtualIndex.clear();
    this.virtualToItem = [];
    for (let i = 0; i < items.length; i++) {
      this.itemToVirtualIndex.set(i, i);
      this.virtualToItem.push(items[i]);
    }

    this.positions = new Array(items.length + 1);
    let currentY = 0;
    for (let i = 0; i < items.length; i++) {
      this.positions[i] = currentY;
      currentY += this.estimatedHeight;
    }
    this.positions[items.length] = currentY;
    this.totalHeight = currentY;

    this.render();
  }

  getVirtualIndex(suggestionIndex) {
    return this.itemToVirtualIndex.get(suggestionIndex) ?? -1;
  }

  getItemAt(virtualIndex) {
    return this.virtualToItem[virtualIndex];
  }

  scrollToIndex(suggestionIndex, options = {}) {
    const virtualIndex = this.getVirtualIndex(suggestionIndex);
    if (virtualIndex === -1) return;

    const align = options.align || 'auto';
    const targetY = this.positions[virtualIndex];
    const containerHeight = this.getViewportHeight();

    if (align === 'start' || options.scrollToTop) {
      this.setScrollTop(targetY);
    } else if (align === 'center') {
      this.setScrollTop(targetY - containerHeight / 2);
    } else if (align === 'end') {
      this.setScrollTop(targetY - containerHeight + this.getItemHeight(virtualIndex));
    } else {
      const viewportStart = this.getScrollTop();
      const viewportEnd = viewportStart + containerHeight;
      const itemStart = targetY;
      const itemEnd = itemStart + this.getItemHeight(virtualIndex);

      if (itemStart < viewportStart) {
        this.setScrollTop(itemStart);
      } else if (itemEnd > viewportEnd) {
        this.setScrollTop(itemEnd - containerHeight);
      }
    }
  }

  getScrollTop() {
    return this.scrollTop;
  }

  setScrollTop(value) {
    this.scrollTop = Math.max(0, Math.min(value, this.totalHeight - this.getViewportHeight()));
    if (this.useWindowScroll) {
      window.scrollTo(0, this.scrollTop);
    } else {
      this.container.scrollTop = this.scrollTop;
    }
    this.render();
  }

  getViewportHeight() {
    return this.useWindowScroll ? window.innerHeight : this.container.clientHeight;
  }

  getItemHeight(index) {
    return this.measuredHeights.get(index) ?? this.estimatedHeight;
  }

  getTotalHeight() {
    return this.totalHeight;
  }

  handleScroll() {
    this.scrollTop = this.useWindowScroll ? window.scrollY : this.container.scrollTop;
    this.render();
  }

  handleResize() {
    this.refresh();
  }

  refresh() {
    this.measuredHeights.clear();
    this.recalculatePositions();
    this.render();
  }

  recalculatePositions() {
    let currentY = 0;
    for (let i = 0; i < this.items.length; i++) {
      this.positions[i] = currentY;
      currentY += this.getItemHeight(i);
    }
    this.positions[this.items.length] = currentY;
    this.totalHeight = currentY;
  }

  findIndexNear(y) {
    if (this.items.length === 0) return 0;

    let low = 0;
    let high = this.positions.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.positions[mid] <= y) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return Math.max(0, Math.min(high, this.items.length - 1));
  }

  render() {
    if (this.items.length === 0) {
      this.container.innerHTML = '';
      this.container.style.height = '0px';
      if (this.onVisibleRangeChange) {
        this.onVisibleRangeChange(0, 0);
      }
      return;
    }

    const scrollTop = this.scrollTop;
    const viewportEnd = scrollTop + this.getViewportHeight();

    const startIndex = this.findIndexNear(scrollTop);
    const endIndex = this.findIndexNear(viewportEnd);

    const renderStart = Math.max(0, startIndex - this.buffer);
    const renderEnd = Math.min(this.items.length, endIndex + this.buffer + 1);

    this.container.style.height = this.totalHeight + 'px';

    // Use a container div for better performance
    let contentContainer = this.container.querySelector('.vs-content');
    if (!contentContainer) {
      contentContainer = document.createElement('div');
      contentContainer.className = 'vs-content';
      this.container.appendChild(contentContainer);
    }
    contentContainer.innerHTML = '';

    for (let i = renderStart; i < renderEnd; i++) {
      const el = this.renderFn(this.items[i], i, i);
      el.style.position = 'absolute';
      el.style.top = this.positions[i] + 'px';
      el.style.width = '100%';
      el.dataset.virtualIndex = i;
      contentContainer.appendChild(el);
    }

    this.measureVisibleHeights(renderStart, renderEnd);

    if (this.onVisibleRangeChange) {
      this.onVisibleRangeChange(renderStart, renderEnd - 1);
    }
  }

  measureVisibleHeights(start, end) {
    const contentContainer = this.container.querySelector('.vs-content');
    if (!contentContainer) return;

    const children = contentContainer.children;
    for (let i = 0; i < children.length; i++) {
      const virtualIndex = parseInt(children[i].dataset.virtualIndex, 10);
      if (!isNaN(virtualIndex)) {
        const rect = children[i].getBoundingClientRect();
        const height = rect.height || this.estimatedHeight;
        this.measuredHeights.set(virtualIndex, height);
      }
    }
  }

  getStats() {
    return {
      totalItems: this.items.length,
      totalHeight: this.totalHeight,
      measuredCount: this.measuredHeights.size,
      bufferSize: this.buffer,
      estimatedHeight: this.estimatedHeight
    };
  }

  destroy() {
    if (this.useWindowScroll) {
      window.removeEventListener('scroll', this.handleScroll);
    } else {
      this.container.removeEventListener('scroll', this.handleScroll);
    }
    window.removeEventListener('resize', this.handleResize);

    this.items = [];
    this.positions = [];
    this.measuredHeights.clear();
    this.itemToVirtualIndex.clear();
    this.virtualToItem = [];
    this.renderFn = null;
    this.onVisibleRangeChange = null;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DynamicVirtualScroll };
}

if (typeof window !== 'undefined') {
  window.DynamicVirtualScroll = DynamicVirtualScroll;
}
