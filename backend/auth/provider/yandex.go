package provider

import (
	"context"
	"errors"
	"strings"

	"github.com/supabase/auth/internal/conf"
	"golang.org/x/oauth2"
)

const (
	defaultYandexAuthHost = "oauth.yandex.ru"
	defaultYandexAPIHost  = "login.yandex.ru"
)

type yandexProvider struct {
	*oauth2.Config
	APIPath string
}

type yandexUser struct {
	ID           string   `json:"id"`
	DefaultEmail string   `json:"default_email"`
	FirstName    string   `json:"first_name"`
	LastName     string   `json:"last_name"`
	Emails       []string `json:"emails"`
}

// NewYandexProvider creates a Yandex account provider.
func NewYandexProvider(ext conf.OAuthProviderConfiguration) (OAuthProvider, error) {
	if err := ext.ValidateOAuth(); err != nil {
		return nil, err
	}

	authHost := chooseHost(ext.URL, defaultYandexAuthHost)
	apiHost := chooseHost(ext.URL, defaultYandexAPIHost)

	return &yandexProvider{
		Config: &oauth2.Config{
			ClientID:     ext.ClientID[0],
			ClientSecret: ext.Secret,
			Endpoint: oauth2.Endpoint{
				AuthURL:  authHost + "/authorize",
				TokenURL: authHost + "/token",
			},
			RedirectURL: ext.RedirectURI,
		},
		APIPath: apiHost + "/info?format=json",
	}, nil
}

func (g yandexProvider) GetOAuthToken(ctx context.Context, code string, opts ...oauth2.AuthCodeOption) (*oauth2.Token, error) {
	return g.Exchange(ctx, code, opts...)
}

func (g yandexProvider) RequiresPKCE() bool {
	return false
}

func (g yandexProvider) GetUserData(ctx context.Context, tok *oauth2.Token) (*UserProvidedData, error) {
	var u yandexUser
	if err := makeRequest(ctx, tok, g.Config, g.APIPath, &u); err != nil {
		return nil, err
	}

	if u.DefaultEmail == "" && len(u.Emails) == 0 {
		return nil, errors.New("unable to find email with Yandex provider")
	}

	emails := make([]Email, 0, len(u.Emails))
	seen := make(map[string]struct{}, len(u.Emails)+1)

	if u.DefaultEmail != "" {
		emails = append(emails, Email{
			Email:    u.DefaultEmail,
			Verified: true,
			Primary:  true,
		})
		seen[u.DefaultEmail] = struct{}{}
	}

	for _, address := range u.Emails {
		if address == "" {
			continue
		}
		if _, ok := seen[address]; ok {
			continue
		}
		emails = append(emails, Email{
			Email:    address,
			Verified: true,
			Primary:  false,
		})
		seen[address] = struct{}{}
	}

	name := strings.TrimSpace(u.FirstName + " " + u.LastName)
	return &UserProvidedData{
		Metadata: &Claims{
			Issuer:        g.APIPath,
			Subject:       u.ID,
			Name:          name,
			Email:         u.DefaultEmail,
			EmailVerified: u.DefaultEmail != "",
			FullName:      name,
			ProviderId:    u.ID,
		},
		Emails: emails,
	}, nil
}
