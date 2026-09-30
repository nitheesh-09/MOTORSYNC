/**
 * SIGNAL PROCESSING CONFIGURATION & ENGINEERING CONSTANTS
 * Motor Health Monitoring and Fault Diagnosis System
 * 
 * Engineering Principle:
 * All signal processing parameters are explicitly documented and configurable.
 * No hidden magic numbers are used in spectral or statistical calculations.
 */

export const DEFAULT_SIGNAL_CONFIG = {
  /**
   * Primary acquisition sampling rate in Hertz (samples per second).
   * Accelerometer IEPE DAQ standard: 2560 Hz (Nyquist bandwidth = 1280 Hz).
   * Must always be a positive real number (> 0).
   */
  samplingRate: 2560,

  /**
   * Number of samples utilized for FFT spectral decomposition.
   * Power of 2 preferred for radix-2 efficiency, or window length N.
   */
  fftSize: 512,

  /**
   * Maximum frequency in Hertz evaluated in the FFT output spectrum.
   * For standard industrial motor vibration analysis, 0 - 300 Hz captures:
   * 1X, 2X, 3X, 4X rotational speeds + electrical 50/100 Hz poles + low-order bearing defects.
   */
  maxAnalysisFrequency: 300,

  /**
   * Frequency resolution step in Hertz between adjacent spectral bins.
   * A 1.0 Hz step provides clean identification of 1X components.
   */
  frequencyResolution: 1.0,

  /**
   * Minimum plausible motor rotational frequency in Hertz (Search Band Lower Limit).
   * 15.0 Hz corresponds to 900 RPM (e.g. 6-pole induction motor at heavy slip).
   */
  minRotationalFrequency: 15.0,

  /**
   * Maximum plausible motor rotational frequency in Hertz (Search Band Upper Limit).
   * 55.0 Hz corresponds to 3300 RPM (e.g. 2-pole induction motor operating up to 3000 RPM + VFD margin).
   */
  maxRotationalFrequency: 55.0,

  /**
   * Grid AC supply line frequency in Hertz to avoid misclassifying electrical pole hum as mechanical rotation.
   * India / Europe standard: 50.0 Hz. (US: 60.0 Hz).
   */
  lineFrequency: 50.0,

  /**
   * Notch half-width around AC line frequency in Hertz.
   * Any peak within [lineFrequency - lineNotchTolerance, lineFrequency + lineNotchTolerance] is ignored for 1X detection.
   */
  lineNotchTolerance: 1.5,

  /**
   * Minimum spectral peak amplitude threshold in mm/s to qualify as a valid rotational candidate.
   * Avoids locking onto pure DAQ noise floor.
   */
  peakProminenceThreshold: 0.20,

  /**
   * Relative frequency tolerance (fractional, e.g. 0.05 = ±5%) when searching for harmonic multiples (2X, 3X, 4X).
   */
  harmonicTolerance: 0.06,

  /**
   * Number of harmonic orders to evaluate above 1X (1X, 2X, 3X, 4X).
   */
  maxHarmonicOrder: 4,

  /**
   * Minimum number of time-domain samples required to perform statistical feature extraction.
   */
  minRequiredSamples: 8,

  /**
   * Minimum number of samples required to calculate an FFT spectrum.
   */
  minFftSamples: 32
};
