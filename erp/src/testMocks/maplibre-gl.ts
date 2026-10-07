const dummyClass = class {};

export default {
  Map: class {
    on = () => {};
    remove = () => {};
    addControl = () => {};
    getSource = () => null;
    addSource = () => {};
    addLayer = () => {};
  },
  NavigationControl: dummyClass,
  AttributionControl: dummyClass,
  Marker: class {
    setLngLat = () => this;
    addTo = () => this;
    remove = () => {};
    setPopup = () => this;
  },
  Popup: class {
    setHTML = () => this;
  },
  LngLatBounds: class {
    extend = () => this;
  },
  setWorkerUrl: () => {},
};
