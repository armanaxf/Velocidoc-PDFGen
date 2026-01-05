import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
} from 'n8n-workflow';

export class VelocidocPdfGen implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Velocidoc PDF Generator',
        name: 'velocidocPdfGen',
        icon: 'file:velocidoc.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"]}}',
        description: 'Generate PDFs from Word templates using Velocidoc',
        defaults: {
            name: 'Velocidoc PDF',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'velocidocApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Generate Document',
                        value: 'generate',
                        description: 'Generate a PDF or DOCX from a template',
                        action: 'Generate a document from template',
                    },
                    {
                        name: 'List Templates',
                        value: 'listTemplates',
                        description: 'Get available templates',
                        action: 'List available templates',
                    },
                ],
                default: 'generate',
            },
            // Generate Operation Fields
            {
                displayName: 'Template ID',
                name: 'templateId',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['generate'],
                    },
                },
                description: 'Template filename (e.g., invoice.docx)',
            },
            {
                displayName: 'Output Format',
                name: 'outputFormat',
                type: 'options',
                options: [
                    { name: 'PDF', value: 'pdf' },
                    { name: 'DOCX', value: 'docx' },
                ],
                default: 'pdf',
                displayOptions: {
                    show: {
                        operation: ['generate'],
                    },
                },
                description: 'The format of the generated document',
            },
            {
                displayName: 'Data (JSON)',
                name: 'data',
                type: 'json',
                default: '{}',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['generate'],
                    },
                },
                description: 'JSON data to merge into the template',
            },
            {
                displayName: 'Binary Property',
                name: 'binaryPropertyName',
                type: 'string',
                default: 'data',
                displayOptions: {
                    show: {
                        operation: ['generate'],
                    },
                },
                description: 'Name of the binary property to store the generated file',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        const operation = this.getNodeParameter('operation', 0) as string;

        const credentials = await this.getCredentials('velocidocApi');
        const apiUrl = credentials.apiUrl as string;
        const apiKey = credentials.apiKey as string;

        for (let i = 0; i < items.length; i++) {
            try {
                if (operation === 'generate') {
                    const templateId = this.getNodeParameter('templateId', i) as string;
                    const outputFormat = this.getNodeParameter('outputFormat', i) as string;
                    const dataStr = this.getNodeParameter('data', i) as string;
                    const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;

                    let data: Record<string, unknown>;
                    try {
                        data = JSON.parse(dataStr);
                    } catch {
                        throw new NodeOperationError(this.getNode(), 'Invalid JSON in Data field', { itemIndex: i });
                    }

                    const payload = {
                        template_id: templateId,
                        output_format: outputFormat,
                        data,
                    };

                    const headers: Record<string, string> = {
                        'Content-Type': 'application/json',
                    };
                    if (apiKey) {
                        headers['X-API-Key'] = apiKey;
                    }

                    const response = await this.helpers.httpRequest({
                        method: 'POST',
                        url: `${apiUrl}/v1/generate`,
                        headers,
                        body: payload,
                        encoding: 'arraybuffer',
                        returnFullResponse: true,
                    });

                    const mimeType = outputFormat === 'pdf'
                        ? 'application/pdf'
                        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

                    const binaryData = await this.helpers.prepareBinaryData(
                        Buffer.from(response.body as ArrayBuffer),
                        `${templateId.replace('.docx', '')}.${outputFormat}`,
                        mimeType,
                    );

                    returnData.push({
                        json: { success: true, templateId, outputFormat },
                        binary: {
                            [binaryPropertyName]: binaryData,
                        },
                    });

                } else if (operation === 'listTemplates') {
                    const headers: Record<string, string> = {};
                    if (apiKey) {
                        headers['X-API-Key'] = apiKey;
                    }

                    const response = await this.helpers.httpRequest({
                        method: 'GET',
                        url: `${apiUrl}/v1/templates`,
                        headers,
                    });

                    returnData.push({
                        json: { templates: response },
                    });
                }

            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: { error: (error as Error).message },
                    });
                    continue;
                }
                throw error;
            }
        }

        return [returnData];
    }
}
