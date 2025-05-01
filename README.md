# SackLM: AI-Powered Chatbot with Customizable Features

SackLM is an innovative AI app designed to enhance chatbot experiences. It offers powerful features like response saving in documents, custom models, and easy organization for chats, documents, and more! 

## Features

- **Response Saving in Documents:** Save your responses directly to documents for future reference and better organization.
- **Custom Models:** Personalize your chatbot's behavior and responses using custom models.
- **Chat & Document Organization:** Keep your chats and documents organized for easy access and efficient workflow.
- **Advanced AI Processing:** Powered by cutting-edge AI technology from **Google AI Studio** for accurate and context-aware responses.
- **Personalization:** Tailor the app’s responses and features to your specific needs using custom models.
- **Authentication & User Management:** Secure user authentication powered by **Clerk**.
- **Real-time Data:** Built with **Supabase** for real-time data and efficient backend management.

## Tech Stack

- **Frontend:** [Next.js 15](https://nextjs.org/)
- **UI:** [Tailwind CSS](https://tailwindcss.com/)
- **AI Processing:** [Google AI Studio](https://cloud.google.com/ai)
- **Authentication & User Management:** [Clerk](https://clerk.dev/)
- **Backend & Database:** [Supabase](https://supabase.io/)

## Installation

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/)
- [Supabase Account](https://app.supabase.io/)
- [Clerk Account](https://clerk.dev/)

### Steps

1. Clone the repository:

    ```bash
    git clone https://github.com/yourusername/SackLM.git
    ```

2. Navigate to the project directory:

    ```bash
    cd SackLM
    ```

3. Install dependencies:

    ```bash
    npm install
    ```

4. Configure environment variables:
    - Create a `.env.local` file in the root of your project.
    - Add your **Supabase** and **Clerk** credentials.

    ```env
    NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
    NEXT_PUBLIC_CLERK_FRONTEND_API=your-clerk-frontend-api
    CLERK_API_KEY=your-clerk-api-key
    ```

5. Run the application:

    ```bash
    npm run dev
    ```

6. Open your browser at [http://localhost:3000](http://localhost:3000) to start using the app.

## Usage

- **Creating and Managing Custom Models:**
    1. Navigate to the "Models" section in the app.
    2. Create a new model, input the necessary parameters, and hit "Save".
    3. Once your model is created, you can start personalizing responses according to your preferences.

- **Saving and Organizing Responses:**
    1. While chatting, you can save responses directly into your document.
    2. Access and manage your saved responses via the "Documents" section.

- **Organizing Chats and Documents:**
    1. Create folders to organize your chats and documents for easy navigation.
    2. Use tags and filters to quickly find specific content.

## Contributing

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/your-feature`).
3. Commit your changes (`git commit -am 'Add new feature'`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Create a new Pull Request.

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Acknowledgements

- **AI Models** from [Google AI Studio](https://cloud.google.com/ai)
- **Authentication & User Management** via [Clerk](https://clerk.dev/)
- **Backend & Real-time Database** powered by [Supabase](https://supabase.io/)
- Libraries and frameworks used:
    - [Next.js 15](https://nextjs.org/)
    - [Tailwind CSS](https://tailwindcss.com/)

## Contact

If you have any questions or need help, feel free to reach out:

- [Divyansh Maurya](mailto:studydivyansh56@gmail.com)
- GitHub: [divyanshMauryaaa](https://github.com/divyanshMauryaaa)
