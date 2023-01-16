import { useEffect, useState } from 'react';
import styles from './App.module.css';

const base_urls = {
    issues: 'https://api.github.com/search/issues?q=repo:binary-com/',
    commits: 'https://api.github.com/search/commits?q=repo:binary-com/',
};

const per_page = 100;

function App() {
    const [pull_requests_statistic, setPullRequestsStatistic] = useState({
        total_count: '...',
        closed: '...',
        open: '...',
    });
    const [pull_requests, setPullRequests] = useState([]);
    const [commits, setCommits] = useState({ total_count: '...' });
    const [winners, setWinners] = useState([]);
    const [range, setRange] = useState({ from: '', to: '' });
    const [is_loading, setIsLoading] = useState(false);
    const [repo, setRepo] = useState('');
    const [is_checked, setIsChecked] = useState({ deriv_app: true, deriv_com: false });

    useEffect(() => {
        setRepo(is_checked.deriv_app ? 'deriv-app' : 'deriv-com');
    }, [is_checked]);

    useEffect(() => {
        if (pull_requests_statistic.total_count === '...') return;
        const pages = Math.ceil(pull_requests_statistic.total_count / per_page);

        const fetchPullRequests = async page => {
            const response_all = await fetch(
                `${base_urls.issues}${repo}+is:pr+created:${range.from}..${range.to}&per_page=${per_page}&page=${page}`
            );
            const { items } = await response_all.json();
            setPullRequests(prev => [...prev, ...items]);
        };

        for (let i = 1; i <= pages; i++) {
            fetchPullRequests(i);
        }
    }, [pull_requests_statistic]);

    useEffect(() => {
        if (pull_requests_statistic.total_count === pull_requests.length) {
            const logins = [...new Set(pull_requests.map(pr => pr.user.login))].filter(
                login => !['github-actions[bot]', 'dependabot[bot]'].includes(login)
            );
            let res = {};
            logins.forEach(login => {
                const amount = pull_requests.filter(pr => pr.user.login === login).length;
                res[login] = amount;
            });

            setWinners([
                ...Object.entries(res)
                    .map(([login, pr_count]) => {
                        return { login: login, pr_count: pr_count };
                    })
                    .sort((a, b) => b.pr_count - a.pr_count),
            ]);

            setIsLoading(false);
        }
    }, [pull_requests_statistic, pull_requests]);

    const onClickHandler = async () => {
        setIsLoading(true);
        const response_all = await fetch(`${base_urls.issues}${repo}+is:pr+created:${range.from}..${range.to}`);
        const { total_count: all } = await response_all.json();
        const response_closed = await fetch(
            `${base_urls.issues}${repo}+is:pr+is:closed+created:${range.from}..${range.to}`
        );
        const { total_count: closed } = await response_closed.json();
        const response_commits_master = await fetch(
            `${base_urls.commits}${repo}+committer-date:${range.from}..${range.to}`
        );
        const { total_count: commits_res } = await response_commits_master.json();
        setPullRequestsStatistic({ total_count: all, closed, open: all - closed });
        setCommits({ total_count: commits_res });
    };

    const onChangeDateHandler = e => {
        switch (e.target.dataset.range) {
            case 'from':
                setRange({ ...range, from: e.target.value });
                break;
            case 'to':
                setRange({ ...range, to: e.target.value });
                break;
        }
    };

    const onChangeRepoHanler = e => {
        switch (e.target.dataset.repo) {
            case 'deriv-app':
                setIsChecked({ deriv_app: true, deriv_com: false });
                break;
            case 'deriv-com':
                setIsChecked({ deriv_app: false, deriv_com: true });
                break;
        }
    };

    const onResetClickHandler = () => {
        setPullRequests([]);
        setCommits({ total_count: '...' });
        setWinners([]);
        setRange({ from: '', to: '' });
        setPullRequestsStatistic({ total_count: '...', closed: '...', open: '...' });
    };

    if (is_loading) {
        return (
            <div className={styles.loaderWrapper}>
                <div className={styles.loader}></div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.repoWrapper}>
                <h2>
                    Choose your <span style={{ textDecoration: 'line-through' }}>destiny</span> repository:
                </h2>
                <label>
                    <span>deriv-app</span>
                    <input
                        type='checkbox'
                        checked={is_checked.deriv_app}
                        data-repo='deriv-app'
                        onChange={onChangeRepoHanler}
                    />
                </label>
                <label>
                    <span>deriv-com</span>
                    <input
                        type='checkbox'
                        checked={is_checked.deriv_com}
                        data-repo='deriv-com'
                        onChange={onChangeRepoHanler}
                    />
                </label>
            </div>
            <div className={styles.dateWrapper}>
                <h2>Choose your date range:</h2>
                <div>
                    <label>
                        <span>From</span>
                        <input type='date' data-range='from' value={range.from} onChange={onChangeDateHandler} />
                    </label>
                </div>
                <div>
                    <label>
                        <span>To</span>
                        <input type='date' data-range='to' value={range.to} onChange={onChangeDateHandler} />
                    </label>
                </div>
            </div>
            <div className={styles.statWrapper}>
                <h3>Total count of pull requests: {pull_requests_statistic.total_count}</h3>
                <h3>Closed pull requests: {pull_requests_statistic.closed}</h3>
                <h3>Still opened pull requests: {pull_requests_statistic.open}</h3>
                <h3>Commits to master branch: {commits.total_count}</h3>
            </div>

            <h3 style={{ color: 'black' }}>Pull request winners: {winners.length !== 0 ? '' : '...'}</h3>
            {winners.length !== 0 && (
                <table style={{ textAlign: 'left', marginBottom: '20px' }}>
                    <thead>
                        <tr>
                            <th>Login</th>
                            <th>PR's</th>
                        </tr>
                    </thead>
                    <tbody>
                        {winners.map(winner => {
                            return (
                                <tr key={winner.login}>
                                    <td>{winner.login}</td>
                                    <td>{winner.pr_count}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
            <div className={styles.buttonsWrapper}>
                <button onClick={onClickHandler} disabled={range.from === '' || range.to === ''}>
                    Get pull requests statistic
                </button>
                <button onClick={onResetClickHandler}>Reset statistic</button>
            </div>
        </div>
    );
}

export default App;
