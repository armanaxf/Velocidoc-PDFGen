import {
    ICredentialType,
    INodeProperties,
} from 'n8n-workflow';

export class VelocidocApi implements ICredentialType {
    name = 'velocidocApi';
    displayName = 'Velocidoc API';
    documentationUrl = 'https://github.com/armanaxf/Velocidoc-PDFGen';
    properties: INodeProperties[] = [
        {
            displayName: 'API URL',
            name: 'apiUrl',
            type: 'string',
            default: 'http://localhost:3000',
            placeholder: 'https://your-velocidoc-instance.com',
            description: 'The base URL of your Velocidoc API',
        },
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            description: 'API Key for authentication (optional for self-hosted)',
        },
    ];
}
