def failedStage = ''

pipeline {
    agent any

    tools {
        // Matches the NodeJS plugin installation name configured in
        // Manage Jenkins → Tools → NodeJS installations
        nodejs 'Node18'
    }

    environment {
        ANTHROPIC_API_KEY             = credentials('ANTHROPIC_API_KEY')
        NEXT_PUBLIC_SUPABASE_URL      = credentials('NEXT_PUBLIC_SUPABASE_URL')
        NEXT_PUBLIC_SUPABASE_ANON_KEY = credentials('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        // Enables the cookie-based auth bypass used by E2E tests
        E2E_TESTING                   = 'true'
        NEXT_PUBLIC_E2E_TESTING       = 'true'
        // jest-junit writes XML files here (read by junit step)
        JEST_JUNIT_OUTPUT_DIR         = 'test-results'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                sh 'npm ci'
            }
            post {
                failure { script { failedStage = 'Install' } }
            }
        }

        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
            post {
                failure { script { failedStage = 'Lint' } }
            }
        }

        stage('Unit Tests') {
            environment {
                JEST_JUNIT_OUTPUT_NAME = 'unit-results.xml'
            }
            steps {
                sh '''
                    npm run test:unit -- \
                        --reporters=default \
                        --reporters=jest-junit \
                        --ci \
                        --forceExit
                '''
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'test-results/unit-results.xml'
                }
                failure { script { failedStage = 'Unit Tests' } }
            }
        }

        stage('Integration Tests') {
            environment {
                JEST_JUNIT_OUTPUT_NAME = 'integration-results.xml'
            }
            steps {
                sh '''
                    npm run test:integration -- \
                        --reporters=default \
                        --reporters=jest-junit \
                        --ci \
                        --forceExit
                '''
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'test-results/integration-results.xml'
                }
                failure { script { failedStage = 'Integration Tests' } }
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
            post {
                failure { script { failedStage = 'Build' } }
            }
        }

        stage('E2E Tests (Playwright)') {
            steps {
                sh 'npx playwright install --with-deps chromium'
                // --reporter=html generates playwright-report/index.html
                // --reporter=list keeps readable console output
                sh 'npm run test:e2e -- --reporter=html --reporter=list'
            }
            post {
                always {
                    publishHTML([
                        allowMissing:          true,
                        alwaysLinkToLastBuild: true,
                        keepAll:               true,
                        reportDir:             'playwright-report',
                        reportFiles:           'index.html',
                        reportName:            'Playwright E2E Report'
                    ])
                }
                failure { script { failedStage = 'E2E Tests (Playwright)' } }
            }
        }

        stage('Security Scan') {
            steps {
                // Fails the build on high or critical vulnerabilities
                sh 'npm audit --audit-level=high'
            }
            post {
                failure { script { failedStage = 'Security Scan' } }
            }
        }
    }

    post {
        always {
            archiveArtifacts(
                artifacts:         'test-results/**/*.xml, playwright-report/**',
                allowEmptyArchive: true
            )
        }
        success {
            mail(
                to:      'team@example.com',
                subject: "✅ ${env.JOB_NAME} #${env.BUILD_NUMBER} passed",
                body:    "All stages passed.\n\n${env.BUILD_URL}"
            )
        }
        failure {
            mail(
                to:      'team@example.com',
                subject: "❌ ${env.JOB_NAME} #${env.BUILD_NUMBER} failed — ${failedStage}",
                body:    "Build failed at stage: ${failedStage}\n\nSee details: ${env.BUILD_URL}"
            )
        }
    }
}
