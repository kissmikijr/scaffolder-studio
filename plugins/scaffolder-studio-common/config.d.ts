
export interface Config {
    /**
     * Configuration options for the Scaffolder Studio plugin
     */
    scaffolder?: {
        studio: {
            /**
             * Configuration for prefabs
             */
            prefabs?: {
                /**
                 * Whether the prefab library feature is enabled.
                 * @visibility frontend
                 */
                libraryEnabled?: boolean;
            };
        };
    }
}
