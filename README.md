# [poidh](https://github.com/picsoritdidnthappen/poidh-app) Indexer Repository

## This repository contains the indexer service for the [poidh](https://github.com/picsoritdidnthappen/poidh-app) application.

## Getting Started

Follow the steps below to set up and run the indexer locally.

---

### 1. Clone the Repository

Make sure you have [Git](https://git-scm.com/docs) installed. Then, clone the repository:

```bash
git clone https://github.com/yukigesho/poidh-indexer.git
```

Navigate to the project directory:

```bash
cd poidh-indexer
```

---

### 2. Database Setup

This project uses a **PostgreSQL** database. Create a new database in your PostgreSQL instance and set the connection URL in a `.env.local` file at the root of the project:

```plaintext
DATABASE_URL="postgresql://<username>:<password>@<host>:<port>/<database>"
```

Replace `<username>`, `<password>`, `<host>`, `<port>`, and `<database>` with your database details.

---

### 3. Add RPC URLs

To interact with various blockchain networks, add the following RPC URLs to your .env.local file:

```plaintext
ARBITRUM_RPC_URL="https://arb-mainnet.g.alchemy.com/v2/<your-alchemy-api-key>"
BASE_RPC_URL="https://base-mainnet.g.alchemy.com/v2/<your-alchemy-api-key>"
DEGEN_RPC_URL="https://rpc.degen.tips"
```
Replace <your-alchemy-api-key> with your Alchemy API key for the respective networks.

---

### 4. Install Dependencies

In the project root directory, install all the required dependencies using [pnpm](https://pnpm.io/):

```bash
pnpm install
```

---

### 5. Run the Indexer

To start the indexer, run:

```bash
pnpm dev
```

The indexer will begin processing. Wait until the indexing is complete before using it further.

---

### Troubleshooting

- Ensure your PostgreSQL server is running and accessible from your environment.
- Verify that the `DATABASE_URL` in the `.env.local` file matches your database configuration.
- If `pnpm` is not installed, refer to the [pnpm installation guide](https://pnpm.io/installation).

---

### Contribution

Feel free to contribute to this repository by submitting issues or creating pull requests. Make sure to follow the project's code of conduct and contribution guidelines.

---

### License

This project is licensed under the [MIT License](LICENSE).

---
