import { DiscoveryService } from '@backstage/backend-plugin-api';
import {
    parseScaffolderTemplate,
    serializeToYaml,
    AllNodeData
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import type { Edge, Node } from '@xyflow/react';

export class ScaffolderStudioClient {
    private readonly discovery: DiscoveryService;

    constructor({ discovery }: { discovery: DiscoveryService }) {
        this.discovery = discovery;
    }

    async getActions({ token }: { token: string }) {
        const baseUrl = await this.discovery.getBaseUrl('scaffolder-studio');

        const response = await fetch(`${baseUrl}/actions`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(
                `Failed to fetch actions: ${response.status} ${response.statusText}`,
            );
        }

        const text = await response.text();
        if (!text.trim()) {
            throw new Error('Empty response from actions endpoint');
        }

        try {
            return JSON.parse(text);
        } catch (error) {
            throw new Error(`Invalid JSON response from actions endpoint: ${error}`);
        }
    }

    async serializeScaffolderTemplate({
        template,
        token,
    }: {
        template: object;
        token: string;
    }) {
        const actions = await this.getActions({ token });
        const data = parseScaffolderTemplate(template, actions);
        return data;
    }

    async serializeScaffolderTemplateToYaml({
        nodes,
        edges,
        sourceNodeId,
    }: {
        nodes: Node<AllNodeData>[];
        edges: Edge[];
        sourceNodeId: string;
    }) {
        const template = serializeToYaml({ nodes, edges, sourceNodeId });
        return template;
    }

    async createOrUpdateTemplate({
        template,
        id,
        token,
    }: {
        template: object;
        id: string;
        token: string;
    }) {
        const baseUrl = await this.discovery.getBaseUrl('scaffolder-studio');
        const response = await fetch(`${baseUrl}/templates/import`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ template, id }),
        });

        if (!response.ok) {
            throw new Error(
                `Failed to create/update template: ${response.status} ${response.statusText}`,
            );
        }

        const text = await response.text();
        if (!text.trim()) {
            return {}; // Empty response is acceptable for this endpoint
        }

        try {
            return JSON.parse(text);
        } catch (error) {
            throw new Error(
                `Invalid JSON response from template import endpoint: ${error}`,
            );
        }
    }

    async getTemplate({ id, token }: { id: string; token: string }) {
        const baseUrl = await this.discovery.getBaseUrl('scaffolder-studio');
        const response = await fetch(`${baseUrl}/templates/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            throw new Error(
                `Failed to fetch template: ${response.status} ${response.statusText}`,
            );
        }
        return response.json();
    }

    async getPrefab({ id, token }: { id: string; token: string }) {
        const baseUrl = await this.discovery.getBaseUrl('scaffolder-studio');
        const response = await fetch(`${baseUrl}/prefabs/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch prefab: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }
}
