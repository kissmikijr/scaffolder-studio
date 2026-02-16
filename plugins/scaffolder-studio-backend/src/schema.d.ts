export interface Config {
  /**
   * @visibility frontend
   */
  scaffolder: {
    /**
 * @visibility frontend
 */
    studio: {
      /**
 * @visibility frontend
 */
      publishers: {
        /**
 * @visibility frontend
 */
        github: {
          enabled: boolean;
        },
        /**
 * @visibility frontend
 */
        event: {
          enabled: boolean;
        }
      }
    }
  }
}
