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

This project uses a **PostgreSQL** database. Create a new database in your PostgreSQL instance and set the connection URL in a `.env` file at the root of the project:

```plaintext
DATABASE_URL="postgresql://<username>:<password>@<host>:<port>/<database>"
```

Replace `<username>`, `<password>`, `<host>`, `<port>`, and `<database>` with your database details.

---

### 3. Install Dependencies

In the project root directory, install all the required dependencies using [pnpm](https://pnpm.io/):

```bash
pnpm install
```

---

### 4. Run the Indexer

To start the indexer, run:

```bash
pnpm dev
```

The indexer will begin processing. Wait until the indexing is complete before using it further.

---

### Troubleshooting

- Ensure your PostgreSQL server is running and accessible from your environment.
- Verify that the `DATABASE_URL` in the `.env` file matches your database configuration.
- If `pnpm` is not installed, refer to the [pnpm installation guide](https://pnpm.io/installation).

---

### Contribution

Feel free to contribute to this repository by submitting issues or creating pull requests. Make sure to follow the project's code of conduct and contribution guidelines.

---

### License

This project is licensed under the [MIT License](LICENSE).

---
