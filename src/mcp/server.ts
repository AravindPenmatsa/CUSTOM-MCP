import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProductService } from "../services/ProductService.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
    name: "ecommerce-custom-mcp",
    version: "1.0.0"
});

const svc = new ProductService();

server.registerTool("add_product",
    {
        title: "Add Product",
        description: "Add a new product to the database",
        inputSchema: {
            sku: z.string().min(1),
            name: z.string().min(1),
            description: z.string().optional().nullable(),
            price: z.number().nonnegative(),
            quantity: z.number().int().nonnegative(),
        },
        outputSchema: {
            id: z.number().int().positive(),
            sku: z.string(),
            name: z.string(),
            description: z.string().nullable(),
            price: z.number(),
            quantity: z.number().int(),
            created_at: z.string(),
            updated_at: z.string(),
        },
    }, async ({ sku, name, description, price, quantity }) => {
        const created = await svc.addProduct({ sku, name, description, price, quantity });
        const normalized = {
            ...created,
            price: Number(created.price),
            created_at: (created.created_at as unknown) instanceof Date
                ? (created.created_at as unknown as Date).toISOString()
                : String(created.created_at),
            updated_at: (created.updated_at as unknown) instanceof Date
                ? (created.updated_at as unknown as Date).toISOString()
                : String(created.updated_at),
        };
        return {
            content: [{ type: "text", text: JSON.stringify(normalized) }],
            structuredContent: normalized,
        };
    }
);

server.registerTool("get_product_by_id",
    {
        title: "Get Product by ID",
        description: "Get a product by ID",
        inputSchema: {
            id: z.number().int().positive(),
        },
        outputSchema: {
            id: z.number().int().positive(),
            sku: z.string(),
            name: z.string(),
            description: z.string().nullable(),
            price: z.number(),
            quantity: z.number().int(),
            created_at: z.string(),
            updated_at: z.string(),
        },
    }, async ({ id }) => {
        const product = await svc.getProductById(id);
        if (!product) {
            return {
                content: [{ type: "text", text: `product ${id} not found` }],
                isError: true,
            };
        }
        const normalized = {
            ...product,
            price: Number(product.price),
            created_at: (product.created_at as unknown) instanceof Date
                ? (product.created_at as unknown as Date).toISOString()
                : String(product.created_at),
            updated_at: (product.updated_at as unknown) instanceof Date
                ? (product.updated_at as unknown as Date).toISOString()
                : String(product.updated_at),
        };
        return {
            content: [{ type: "text", text: JSON.stringify(normalized) }],
            structuredContent: normalized,
        };
    }
);


server.registerTool("delete_product",
    {
        title: "Delete Product",
        description: "Delete a product by ID",
        inputSchema: {
            id: z.number().int().positive(),
        },
        outputSchema: {
            deleted: z.boolean()
        },
    }, async ({ id }) => {
        const ok = await svc.deleteProduct(id);
        if (!ok) {
            return {
                content: [{ type: "text", text: `product ${id} not found` }],
                isError: true,
            };
        }
        return {
            content: [{ type: "text", text: JSON.stringify({ deleted: ok }) }],
            structuredContent: { deleted: ok },
        };
    }
);

server.registerResource("products-catalog", "products://catalog",
    {
        description: "Browse all products in the catalog"
    },
    async (uri) => {
        const products = await svc.listProducts(200, 0);
        return { contents: [{ uri: uri.href, type: "text", text: JSON.stringify(products) }] };
    },
);

// start communication with client 
(async () => {
    const transport = new StdioServerTransport();
    await server.connect(transport);
})();